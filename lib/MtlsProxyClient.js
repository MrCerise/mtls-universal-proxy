const https = require('https');
const path = require('path');
const fs = require('fs');

class MtlsProxyClient {
  /**
   * @param {Object}
   * @param {string} config.proxyHost - Proxy IP/hostname
   * @param {number} [config.proxyPort=7878] - Proxy Port
   * @param {string|Buffer} config.key - File path or Buffer of client.key
   * @param {string|Buffer} config.cert - File path or Buffer of client.crt
   * @param {string|Buffer} config.ca - File path or Buffer of ca.crt
   * @param {boolean} [config.rejectUnauthorized=true] - Reject untrusted CA certificates
   */
  constructor(config = {}) {
    if (!config.proxyHost) throw new Error('[MtlsProxyClient] config.proxyHost is required.');
    if (!config.key) throw new Error('[MtlsProxyClient] config.key is required.');
    if (!config.cert) throw new Error('[MtlsProxyClient] config.cert is required.');
    if (!config.ca) throw new Error('[MtlsProxyClient] config.ca is required.');

    this.proxyHost = config.proxyHost;
    this.proxyPort = config.proxyPort || 7878;

    const key = Buffer.isBuffer(config.key) ? config.key : fs.readFileSync(path.resolve(config.key));
    const cert = Buffer.isBuffer(config.cert) ? config.cert : fs.readFileSync(path.resolve(config.cert));
    const ca = Buffer.isBuffer(config.ca) ? config.ca : fs.readFileSync(path.resolve(config.ca));

    this.tlsOptions = {
      key,
      cert,
      ca,
      rejectUnauthorized: config.rejectUnauthorized !== undefined ? config.rejectUnauthorized : true,
      checkServerIdentity: () => undefined,
    };
  }
  
  request(targetUrl, options = {}) {
    return new Promise((resolve, reject) => {
      const method = (options.method || 'GET').toUpperCase();
      let payload = null;

      const reqHeaders = {
        'Host': this.proxyHost,
        'User-Agent': 'MtlsProxyClient/1.0',
        'X-Target-Url': targetUrl,
        'X-Target-Method': method,
        ...(options.headers || {}),
      };

      if (options.data !== null && options.data !== undefined) {
        if (Buffer.isBuffer(options.data)) {
          payload = options.data;
          if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
            reqHeaders['Content-Type'] = 'application/octet-stream';
          }
        } else if (typeof options.data === 'object') {
          payload = JSON.stringify(options.data);
          if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
            reqHeaders['Content-Type'] = 'application/json';
          }
        } else {
          payload = String(options.data);
        }
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const requestOptions = {
        ...this.tlsOptions,
        hostname: this.proxyHost,
        port: this.proxyPort,
        method: method,
        path: '/',
        headers: reqHeaders,
      };

      const req = https.request(requestOptions, (res) => {
        let responseChunks = [];

        res.on('data', (chunk) => responseChunks.push(chunk));

        res.on('end', () => {
          const buffer = Buffer.concat(responseChunks);
          const rawText = buffer.toString('utf8');

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: rawText,
            buffer: buffer,
            json: () => {
              try {
                return JSON.parse(rawText);
              } catch (e) {
                throw new Error(`Failed to parse JSON response: ${e.message}`);
              }
            },
          });
        });
      });

      if (options.timeout) {
        req.setTimeout(options.timeout, () => {
          req.destroy(new Error(`Timeout reached for ${targetUrl}`));
        });
      }

      req.on('error', (err) => reject(err));

      if (payload) req.write(payload);
      req.end();
    });
  }

  get(targetUrl, headers = {}, options = {}) {
    return this.request(targetUrl, { ...options, method: 'GET', headers });
  }

  post(targetUrl, data = null, headers = {}, options = {}) {
    return this.request(targetUrl, { ...options, method: 'POST', data, headers });
  }

  put(targetUrl, data = null, headers = {}, options = {}) {
    return this.request(targetUrl, { ...options, method: 'PUT', data, headers });
  }

  patch(targetUrl, data = null, headers = {}, options = {}) {
    return this.request(targetUrl, { ...options, method: 'PATCH', data, headers });
  }

  delete(targetUrl, headers = {}, options = {}) {
    return this.request(targetUrl, { ...options, method: 'DELETE', headers });
  }
}

module.exports = MtlsProxyClient;
