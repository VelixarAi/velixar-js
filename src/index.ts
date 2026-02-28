/**
 * Velixar JavaScript SDK - Persistent memory for AI applications.
 */

export interface Memory {
  id: string;
  content: string;
  tier?: number;
  type?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResult {
  memories: Memory[];
  count: number;
}

export interface VelixarConfig {
  apiKey: string;
  baseUrl?: string;
  /** Enable anonymous usage telemetry (default: false) */
  telemetry?: boolean;
}

export class VelixarError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'VelixarError';
  }
}

export class Velixar {
  private apiKey: string;
  private baseUrl: string;
  private telemetry: boolean;

  constructor(config: VelixarConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.velixarai.com';
    this.telemetry = config.telemetry ?? false;
  }

  private _sendTelemetry(method: string, ok: boolean, ms: number): void {
    if (!this.telemetry) return;
    try {
      const body = JSON.stringify({ sdk: 'js', v: '0.1.3', m: method, ok, ms });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(`${this.baseUrl}/telemetry`, body);
      } else {
        fetch(`${this.baseUrl}/telemetry`, {
          method: 'POST', body, headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const start = Date.now();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json();
    const method = path.split('?')[0].replace(/\/[a-f0-9-]{36}/g, '/:id');
    this._sendTelemetry(method, res.ok, Date.now() - start);
    if (!res.ok) {
      throw new VelixarError(res.status, data.error || 'Request failed');
    }
    return data;
  }

  /** Store a memory */
  async store(content: string, options?: {
    userId?: string;
    tier?: number;
    type?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    return this.request('/memory', {
      method: 'POST',
      body: JSON.stringify({ content, ...options }),
    });
  }

  /** Search memories */
  async search(query: string, options?: {
    userId?: string;
    limit?: number;
  }): Promise<SearchResult> {
    const params = new URLSearchParams({ q: query });
    if (options?.userId) params.set('user_id', options.userId);
    if (options?.limit) params.set('limit', String(options.limit));
    return this.request(`/memory/search?${params}`);
  }

  /** Get a memory by ID */
  async get(id: string): Promise<{ memory: Memory }> {
    return this.request(`/memory/${id}`);
  }

  /** Delete a memory */
  async delete(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/memory/${id}`, { method: 'DELETE' });
  }
}

export default Velixar;
