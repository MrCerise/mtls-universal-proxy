const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

class MtlsProxyServer {
  /**
   * @param {Object}
   * @param {string|Buffer} config.key - File path or Buffer of server.key
   * @param {string|Buffer} config.cert - File path or Buffer of server.crt
   * @param {string|Buffer} config.ca - File path or Buffer of ca.crt
   * @param {number} [config.port=7878] - Proxy listening port
   * @param {string} [config.host='0.0.0.0'] - Proxy binding interface
   */
  constructor(config = {}) {
    if (!config.key) throw new Error('[MtlsProxyServer] config.key is required.');
    if (!config.cert) throw new Error('[MtlsProxyServer] config.cert is required.');
    if (!config.ca) throw new Error('[MtlsProxyServer] config.ca is required.');

    this.port = config.port || 7878;
    this.host = config.host || '0.0.0.0';

    const key = Buffer.isBuffer(config.key) ? config.key : fs.readFileSync(path.resolve(config.key));
    const cert = Buffer.isBuffer(config.cert) ? config.cert : fs.readFileSync(path.resolve(config.cert));
    const ca = Buffer.isBuffer(config.ca) ? config.ca : fs.readFileSync(path.resolve(config.ca));

    this.tlsOptions = {
      key,
      cert,
      ca,
      requestCert: true,
      rejectUnauthorized: true,
    };

    this.server = null;
  }

  listen() {
    return new Promise((resolve, reject) => {
      this.server = https.createServer(this.tlsOptions, (req, res) => this._handleRequest(req, res));

      this.server.on('error', (err) => reject(err));

      this.server.listen(this.port, this.host, () => {
        console.log(`[MtlsProxyServer] Running on https://${this.host}:${this.port}`);
        resolve(this.server);
      });
    });
  }

  /**
   * Stops the mTLS Proxy Server
   * @returns {Promise<void>}
   */
  close() {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((err) => {
        if (err) return reject(err);
        console.log('[MtlsProxyServer] Stopped successfully.');
        resolve();
      });
    });
  }

  /**
   * Request Routing Engine
   * @private
   */
  _handleRequest(req, res) {
    const clientCert = req.socket.getPeerCertificate();
    if (!clientCert || !Object.keys(clientCert).length) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Client certificate required.');
      return;
    }

    const targetUrlStr = req.headers['x-target-url'];
    if (!targetUrlStr) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing required "X-Target-Url" header.');
      return;
    }

    let targetUrl;
    try {
      targetUrl = new URL(targetUrlStr);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid "X-Target-Url" header value.');
      return;
    }

    const targetMethod = (req.headers['x-target-method'] || req.method).toUpperCase();

    const forwardHeaders = { ...req.headers };
    delete forwardHeaders['x-target-url'];
    delete forwardHeaders['x-target-method'];
    delete forwardHeaders['host'];
    forwardHeaders['host'] = targetUrl.host;

    const transport = targetUrl.protocol === 'https:' ? https : http;

    const forwardOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: targetMethod,
      headers: forwardHeaders,
    };

    const proxyReq = transport.request(forwardOptions, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end(`Bad Gateway: ${err.message}`);
      }
    });

    req.pipe(proxyReq, { end: true });
  }
}

module.exports = MtlsProxyServer;
