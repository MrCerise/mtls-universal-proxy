# mtls-universal-proxy

> Zero-trust Mutual TLS (mTLS) forward proxy server and promise-based client SDK for Node.js with **zero external dependencies**.

[![npm version](https://img.shields.io/npm/v/mtls-universal-proxy.svg)](https://www.npmjs.com/package/mtls-universal-proxy)
[![license](https://img.shields.io/npm/l/mtls-universal-proxy.svg)](LICENSE)

`mtls-universal-proxy` makes it seamless to route HTTP/HTTPS traffic through a secure, encrypted mTLS tunnel. It provides both a robust proxy server that authenticates incoming client certificates and forwards requests to target URLs, and a lightweight, promise-based HTTP client SDK.

---

## Features

- 🔒 **Zero-Trust Security**: Enforces 2-way Mutual TLS (mTLS) authentication out of the box.
- ⚡ **Zero External Dependencies**: Built entirely on native Node.js core modules (`https`, `http`, `fs`, `path`).
- 🚀 **Full HTTP Parity**: Supports all HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), custom headers, query params, and binary streams.
- 📦 **Dual Module Support**: Natively compatible with both CommonJS (`require`) and ES Modules (`import`).
- 📘 **TypeScript Ready**: Complete TypeScript definition files (`.d.ts`) included out-of-the-box.
- 🛠️ **Flexibility**: Load certificates via file paths or directly from memory `Buffer` objects.

---

## Installation

```bash
npm install mtls-universal-proxy
```

---

## 🔑 Certificate Setup (Quick Start)

mTLS requires a Root Certificate Authority (CA) to sign both the server and client certificates.

### Generate Certificates (Linux / Git Bash / PowerShell)

```bash
# 1. Create Root CA
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt \
  -subj "/C=US/ST=State/L=City/O=MyOrg/OU=CA/CN=MyProxyRootCA"

# 2. Server SAN Config (server.ext)
echo "authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = 127.0.0.1
DNS.1 = localhost" > server.ext

# 3. Create Server Cert
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/C=US/ST=State/L=City/O=MyOrg/OU=Server/CN=MyProxyServer"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256 -extfile server.ext

# 4. Create Client Cert
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr -subj "/C=US/ST=State/L=City/O=MyOrg/OU=Client/CN=MyProxyClient"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 365 -sha256
```

---

## 🚀 Usage Guide

### 1. Starting the Proxy Server

```javascript
const { MtlsProxyServer } = require('mtls-universal-proxy');

const server = new MtlsProxyServer({
  port: 7878,
  host: '0.0.0.0',
  key: './certs/server.key',
  cert: './certs/server.crt',
  ca: './certs/ca.crt',
});

server.listen().then(() => {
  console.log('mTLS Proxy Server running on port 7878');
}).catch((err) => {
  console.error('Failed to start proxy:', err);
});
```

### 2. Making Client Requests

```javascript
const { MtlsProxyClient } = require('mtls-universal-proxy');

const client = new MtlsProxyClient({
  proxyHost: '127.0.0.1',
  proxyPort: 7878,
  key: './certs/client.key',
  cert: './certs/client.crt',
  ca: './certs/ca.crt',
});

async function run() {
  try {
    // GET Request
    const getRes = await client.get('https://httpbin.org/get');
    console.log('Status:', getRes.statusCode);
    console.log('Response JSON:', getRes.json());

    // POST Request
    const postRes = await client.post('https://httpbin.org/post', {
      user: 'alice',
      action: 'login'
    }, {
      'Authorization': 'Bearer secret-token'
    });
    console.log('Echoed Data:', postRes.json().json);

  } catch (error) {
    console.error('Proxy Client Error:', error.message);
  }
}

run();
```

---

## 📖 API Reference

### `MtlsProxyServer`

#### `new MtlsProxyServer(options)`
- `options.key` (`string | Buffer`): Path or Buffer containing `server.key`. **Required.**
- `options.cert` (`string | Buffer`): Path or Buffer containing `server.crt`. **Required.**
- `options.ca` (`string | Buffer`): Path or Buffer containing `ca.crt`. **Required.**
- `options.port` (`number`): Port number to listen on. Default: `13159`.
- `options.host` (`string`): Host/IP interface to bind to. Default: `'0.0.0.0'`.

#### Methods
- `server.listen()`: Starts the HTTPS server. Returns `Promise<https.Server>`.
- `server.close()`: Stops the HTTPS server. Returns `Promise<void>`.

---

### `MtlsProxyClient`

#### `new MtlsProxyClient(options)`
- `options.proxyHost` (`string`): Proxy server host/IP address. **Required.**
- `options.key` (`string | Buffer`): Path or Buffer containing `client.key`. **Required.**
- `options.cert` (`string | Buffer`): Path or Buffer containing `client.crt`. **Required.**
- `options.ca` (`string | Buffer`): Path or Buffer containing `ca.crt`. **Required.**
- `options.proxyPort` (`number`): Proxy port. Default: `13159`.
- `options.rejectUnauthorized` (`boolean`): Verify proxy TLS cert. Default: `true`.

#### Methods

All request methods return a Promise resolving to a **Response Object**:

```typescript
{
  statusCode: number;           // HTTP response status code (e.g. 200)
  headers: IncomingHttpHeaders; // Response headers object
  data: string;                 // Raw response body as text
  buffer: Buffer;               // Raw response body as Buffer
  json: () => T;                // Helper function to parse data as JSON
}
```

##### `.get(targetUrl, [headers], [options])`
##### `.post(targetUrl, [data], [headers], [options])`
##### `.put(targetUrl, [data], [headers], [options])`
##### `.patch(targetUrl, [data], [headers], [options])`
##### `.delete(targetUrl, [headers], [options])`
##### `.request(targetUrl, options)`
- `targetUrl` (`string`): Full URL of destination server (e.g. `'https://api.example.com/v1/data'`).
- `options.method` (`string`): HTTP method verb. Default: `'GET'`.
- `options.data` (`any`): Request body payload (`Object`, `string`, or `Buffer`).
- `options.headers` (`Object`): Object containing custom HTTP request headers.
- `options.timeout` (`number`): Request timeout in milliseconds.

---

## 📄 License

MIT