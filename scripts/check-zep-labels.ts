import { ZepClient } from "@getzep/zep-cloud";

const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY! });

async function main() {
  // Get workspace ID from DB
  const { db } = await import('@/db/client');
  const { workspaces } = await import('@/db/schema');
  const ws = await db.query.workspaces.findFirst();
  if (!ws) { console.log("No workspace"); process.exit(1); }
  
  console.log("workspace:", ws.id);
  const nodes = await zep.graph.node.getByGraphId(ws.id, {});
  console.log(`Total nodes from Zep: ${nodes.length}`);
  nodes.slice(0, 10).forEach(n => {
    console.log(`  name=${n.name} labels=${JSON.stringify(n.labels ?? [])}`);
  });
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
