import Velixar from 'velixar';

const v = new Velixar({ apiKey: process.env.VELIXAR_API_KEY! });

async function main() {
  // Store memories
  const { id } = await v.store('User prefers concise responses', {
    tags: ['preferences'],
  });
  console.log('Stored:', id);

  // Search
  const { memories } = await v.search('preferences');
  console.log('Found:', memories.length, 'memories');

  // Get
  const { memory } = await v.get(id);
  console.log('Memory:', memory.content);

  // Delete
  await v.delete(id);
  console.log('Deleted');
}

main().catch(console.error);
