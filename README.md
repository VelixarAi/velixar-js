# Velixar JavaScript SDK

[![npm](https://img.shields.io/npm/v/velixar)](https://www.npmjs.com/package/velixar)
[![License](https://img.shields.io/github/license/VelixarAi/velixar-js)](LICENSE)

Persistent memory for AI assistants and agents. Give any LLM-powered application long-term recall across sessions.

Velixar is an open memory layer — it works with any AI assistant, agent framework, or LLM pipeline. Store facts, preferences, and context that persist beyond a single conversation.

## Installation

```bash
npm install velixar
```

## Quick Start

```typescript
import Velixar from 'velixar';

const v = new Velixar({ apiKey: 'vlx_your_key' });

// Store a memory
const { id } = await v.store('User prefers dark mode');

// Search memories semantically
const { memories } = await v.search('preferences');

// Retrieve by ID
const { memory } = await v.get(id);

// Delete
await v.delete(id);
```

## Memory Tiers

| Tier | Name | Use Case |
|------|------|----------|
| 0 | Pinned | Critical facts, never expire |
| 1 | Session | Current conversation context |
| 2 | Semantic | Long-term memories (default) |
| 3 | Organization | Shared team/org knowledge |

```typescript
// Pin a critical fact
await v.store('User is allergic to peanuts', { tier: 0 });

// Store session context
await v.store('Currently debugging auth flow', { tier: 1 });
```

## Per-User Memories

```typescript
await v.store('Loves TypeScript', { userId: 'user_123' });

const results = await v.search('programming', {
  userId: 'user_123',
  limit: 5,
});
```

## Use With Any AI Assistant

Velixar is assistant-agnostic. Use it with OpenAI, Anthropic, LangChain, custom agents, IDE assistants, CLI tools, or any system that calls an LLM:

```typescript
// Before calling your LLM, inject relevant memories as context
const { memories } = await v.search(userMessage, { limit: 5 });
const context = memories.map(m => m.content).join('\n');

const response = await llm.chat([
  { role: 'system', content: `Relevant memories:\n${context}` },
  { role: 'user', content: userMessage },
]);

// After the conversation, store important facts
await v.store('User prefers concise answers', { userId: 'user_123' });
```

## Error Handling

```typescript
import { Velixar, VelixarError } from 'velixar';

try {
  await v.store('content');
} catch (e) {
  if (e instanceof VelixarError) {
    console.log(e.status, e.message);
  }
}
```

## Configuration

```typescript
const v = new Velixar({
  apiKey: 'vlx_...',       // Required — get one at velixarai.com
  baseUrl: 'https://...',  // Optional — custom endpoint
});
```

## Get an API Key

Sign up at [velixarai.com](https://velixarai.com) and generate a key under Settings → API Keys.

## Related

- [velixar (Python SDK)](https://github.com/VelixarAi/velixar-python) — Python client with LangChain/LlamaIndex integrations
- [velixar-mcp-server](https://github.com/VelixarAi/velixar-mcp-server) — MCP server for any MCP-compatible AI assistant

## License

MIT
