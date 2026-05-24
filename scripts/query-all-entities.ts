import { db } from '@/db/client';
import { entities } from '@/db/schema';

async function main() {
  const rows = await db.query.entities.findMany();
  console.log(`Total: ${rows.length}`);
  rows.forEach(r => console.log(`kind=${r.kind?.padEnd(14)} conn=${String(r.connectionCount??0).padEnd(4)} name=${r.name}`));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
