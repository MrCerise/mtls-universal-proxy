import { Server } from 'https';
import { IncomingHttpHeaders } from 'http';

export interface ProxyServerOptions {
  key: string | Buffer;
  cert: string | Buffer;
  ca: string | Buffer;
  port?: number;
  host?: string;
}

export interface ProxyClientOptions {
  proxyHost: string;
  proxyPort?: number;
  key: string | Buffer;
  cert: string | Buffer;
  ca: string | Buffer;
  rejectUnauthorized?: boolean;
}

export interface ProxyRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ProxyResponse<T = any> {
  statusCode: number;
  headers: IncomingHttpHeaders;
  data: string;
  buffer: Buffer;
  json: () => T;
}

export class MtlsProxyServer {
  constructor(options: ProxyServerOptions);
  listen(): Promise<Server>;
  close(): Promise<void>;
}

export class MtlsProxyClient {
  constructor(options: ProxyClientOptions);
  request<T = any>(targetUrl: string, options?: ProxyRequestOptions): Promise<ProxyResponse<T>>;
  get<T = any>(targetUrl: string, headers?: Record<string, string>, options?: ProxyRequestOptions): Promise<ProxyResponse<T>>;
  post<T = any>(targetUrl: string, data?: any, headers?: Record<string, string>, options?: ProxyRequestOptions): Promise<ProxyResponse<T>>;
  put<T = any>(targetUrl: string, data?: any, headers?: Record<string, string>, options?: ProxyRequestOptions): Promise<ProxyResponse<T>>;
  patch<T = any>(targetUrl: string, data?: any, headers?: Record<string, string>, options?: ProxyRequestOptions): Promise<ProxyResponse<T>>;
  delete<T = any>(targetUrl: string, headers?: Record<string, string>, options?: ProxyRequestOptions): Promise<ProxyResponse<T>>;
}