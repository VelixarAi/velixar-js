/**
 * Velixar JavaScript SDK v1.0.0
 * Persistent cognitive memory for AI applications.
 * Mirrors the MCP server tool taxonomy.
 */

// ── Types ──

export interface Memory {
  id: string;
  content: string;
  tier?: number;
  tags?: string[];
  created_at?: string;
  salience?: number;
}

export interface SearchResult { memories: Memory[]; count?: number; }
export interface ListResult { memories: Memory[]; cursor?: string; }
export interface GraphEntity { id: string; entity_type: string; label: string; properties?: Record<string, unknown>; relevance?: number; }
export interface GraphRelation { source: string; target: string; relation_type: string; weight?: number; }
export interface TraverseResult { nodes: GraphEntity[]; edges: GraphRelation[]; }
export interface IdentityProfile { name?: string; role?: string; expertise?: string[]; preferences?: Record<string, unknown>; }
export interface OverviewResult { total_memories: number; cortex_nodes: number; knowledge_density: string; }
export interface WebhookResult { stored: boolean; id?: string; event_type: string; }
export interface ExportResult { format: string; count: number; memories?: Memory[]; content?: string; graph?: Record<string, unknown>; }

export interface VelixarConfig {
  apiKey: string;
  baseUrl?: string;
  workspaceId?: string;
  maxRetries?: number;
  timeout?: number;
}

export class VelixarError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'VelixarError';
  }
}

// ── Client ──

export class Velixar {
  private apiKey: string;
  private baseUrl: string;
  private workspaceId?: string;
  private maxRetries: number;
  private timeout: number;

  constructor(config: VelixarConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.velixarai.com').replace(/\/$/, '');
    this.workspaceId = config.workspaceId;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 30000;
  }

  private async request<T>(path: string, options: RequestInit & { params?: Record<string, string> } = {}): Promise<T> {
    const { params, ...fetchOpts } = options;
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        const res = await fetch(url, {
          ...fetchOpts,
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'velixar-js/1.0.0',
            ...(this.workspaceId ? { 'X-Workspace-Id': this.workspaceId } : {}),
            ...fetchOpts.headers,
          },
        });
        clearTimeout(timer);

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            throw new VelixarError(res.status, body.slice(0, 200));
          }
          throw new VelixarError(res.status, body.slice(0, 200));
        }
        return await res.json() as T;
      } catch (err) {
        lastError = err as Error;
        if (err instanceof VelixarError && err.status >= 400 && err.status < 500 && err.status !== 429) throw err;
        if (attempt < this.maxRetries) await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
      }
    }
    throw lastError!;
  }

  // ── Memory CRUD ──

  async store(content: string, opts?: { userId?: string; tier?: number; tags?: string[] }): Promise<{ id: string }> {
    return this.request('/memory', { method: 'POST', body: JSON.stringify({ content, user_id: opts?.userId, tier: opts?.tier, tags: opts?.tags }) });
  }

  async search(query: string, opts?: { userId?: string; limit?: number }): Promise<SearchResult> {
    const params: Record<string, string> = { q: query };
    if (opts?.userId) params.user_id = opts.userId;
    if (opts?.limit) params.limit = String(opts.limit);
    return this.request('/memory/search', { params });
  }

  async list(opts?: { limit?: number; cursor?: string; userId?: string }): Promise<ListResult> {
    const params: Record<string, string> = {};
    if (opts?.limit) params.limit = String(opts.limit);
    if (opts?.cursor) params.cursor = opts.cursor;
    if (opts?.userId) params.user_id = opts.userId;
    return this.request('/memory/list', { params });
  }

  async get(id: string): Promise<Memory> {
    return this.request(`/memory/${id}`);
  }

  async update(id: string, updates: { content?: string; tags?: string[] }): Promise<{ updated: boolean }> {
    return this.request(`/memory/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/memory/${id}`, { method: 'DELETE' });
  }

  // ── Graph ──

  async graphTraverse(entity: string, opts?: { depth?: number }): Promise<TraverseResult> {
    return this.request('/graph/traverse', { method: 'POST', body: JSON.stringify({ entity, max_hops: opts?.depth ?? 2 }) });
  }

  async graphSearch(query: string, opts?: { entityType?: string; limit?: number }): Promise<{ entities: GraphEntity[] }> {
    return this.request('/graph/search', { method: 'POST', body: JSON.stringify({ query, entity_type: opts?.entityType, limit: opts?.limit ?? 20 }) });
  }

  async graphEntities(opts?: { limit?: number }): Promise<{ entities: GraphEntity[] }> {
    const params: Record<string, string> = {};
    if (opts?.limit) params.limit = String(opts.limit);
    return this.request('/graph/entities', { params });
  }

  // ── Identity ──

  async getIdentity(opts?: { userId?: string }): Promise<IdentityProfile> {
    const params: Record<string, string> = {};
    if (opts?.userId) params.user_id = opts.userId;
    return this.request('/memory/identity', { params });
  }

  // ── Exocortex ──

  async overview(): Promise<OverviewResult> {
    return this.request('/exocortex/overview');
  }

  async contradictions(): Promise<{ contradictions: Array<Record<string, unknown>> }> {
    return this.request('/exocortex/contradictions');
  }

  // ── CI/CD Webhook ──

  async webhook(eventType: string, content: string, opts?: { tags?: string[]; metadata?: Record<string, unknown> }): Promise<WebhookResult> {
    return this.request('/webhook/ci', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, content, tags: opts?.tags, ...opts?.metadata }),
    });
  }

  // ── Import / Export ──

  async exportMemories(opts?: { format?: 'json' | 'markdown'; query?: string; limit?: number; includeGraph?: boolean }): Promise<ExportResult> {
    const params: Record<string, string> = {};
    if (opts?.format) params.format = opts.format;
    if (opts?.query) params.q = opts.query;
    if (opts?.limit) params.limit = String(opts.limit);
    if (opts?.includeGraph) params.include_graph = 'true';
    return this.request('/memory/export', { params });
  }

  async importMemories(data: Array<{ content: string; tags?: string[]; tier?: number }>, opts?: { source?: string; defaultTags?: string[] }): Promise<{ imported: number; failed: number }> {
    return this.request('/memory/import', {
      method: 'POST',
      body: JSON.stringify({ data, source: opts?.source, default_tags: opts?.defaultTags }),
    });
  }

  // ── Health ──

  async health(): Promise<Record<string, unknown>> {
    return this.request('/health');
  }
}

export default Velixar;
