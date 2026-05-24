import { db } from '@/db/client';
import { entities } from '@/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const rows = await db.select({ name: entities.name, kind: entities.kind, connectionCount: entities.connectionCount }).from(entities).orderBy(desc(entities.connectionCount)).limit(30);
  rows.forEach(r => console.log((r.kind ?? 'unknown').padEnd(14), String(r.connectionCount ?? 0).padEnd(4), r.name));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
