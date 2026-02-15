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

  constructor(config: VelixarConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json();
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
