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

export interface ListResult {
  memories: Memory[];
  total: number;
  limit: number;
  offset: number;
}

export interface VelixarConfig {
  apiKey: string;
  baseUrl?: string;
  /** Max retry attempts on transient failures (default: 3) */
  maxRetries?: number;
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
  private maxRetries: number;
  private telemetry: boolean;

  constructor(config: VelixarConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.velixarai.com';
    this.maxRetries = config.maxRetries ?? 3;
    this.telemetry = config.telemetry ?? false;
  }

  private _sendTelemetry(method: string, ok: boolean, ms: number): void {
    if (!this.telemetry) return;
    try {
      const body = JSON.stringify({ sdk: 'js', v: '0.2.0', m: method, ok, ms });
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
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'velixar-js/0.2.0',
            ...options.headers,
          },
        });

        const data = await res.json();
        const method = path.split('?')[0].replace(/\/[a-f0-9-]{36}/g, '/:id');
        this._sendTelemetry(method, res.ok, Date.now() - start);

        if (!res.ok) {
          // Don't retry 4xx (except 429)
          if (res.status !== 429 && res.status >= 400 && res.status < 500) {
            throw new VelixarError(res.status, data.error || 'Request failed');
          }
          throw new VelixarError(res.status, data.error || 'Request failed');
        }
        return data;
      } catch (err) {
        lastError = err as Error;
        // Don't retry non-retryable errors
        if (err instanceof VelixarError && err.status >= 400 && err.status < 500 && err.status !== 429) {
          throw err;
        }
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
        }
      }
    }
    throw lastError!;
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
      body: JSON.stringify({
        content,
        user_id: options?.userId,
        tier: options?.tier,
        type: options?.type,
        tags: options?.tags,
        metadata: options?.metadata,
      }),
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

  /** List memories with pagination */
  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ListResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const qs = params.toString();
    return this.request(`/memory/list${qs ? `?${qs}` : ''}`);
  }

  /** Get a memory by ID */
  async get(id: string): Promise<{ memory: Memory }> {
    return this.request(`/memory/${id}`);
  }

  /** Update a memory */
  async update(id: string, updates: {
    content?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<{ memory: Memory }> {
    return this.request(`/memory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /** Delete a memory */
  async delete(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/memory/${id}`, { method: 'DELETE' });
  }
}

export default Velixar;
