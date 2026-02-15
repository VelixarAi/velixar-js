# Velixar JavaScript SDK

Persistent memory infrastructure for AI applications.

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

// Search memories
const { memories } = await v.search('preferences');

// Get specific memory
const { memory } = await v.get(id);

// Delete memory
await v.delete(id);
```

## With User Context

```typescript
// Store per-user memories
await v.store('Loves TypeScript', { userId: 'user_123' });

// Search user's memories
const results = await v.search('programming', { 
  userId: 'user_123',
  limit: 5 
});
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

## License

MIT
