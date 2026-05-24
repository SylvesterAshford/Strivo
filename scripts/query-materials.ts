import { db } from '@/db/client';
import { materials } from '@/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const rows = await db.query.materials.findMany({ orderBy: (m, { desc }) => [desc(m.uploadedAt)], limit: 10 });
  rows.forEach(r => console.log((r.processingStatus ?? '').padEnd(10), String(r.entitiesAdded ?? 0).padEnd(5), r.title));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
