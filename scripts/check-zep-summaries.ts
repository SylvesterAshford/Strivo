import { ZepClient } from "@getzep/zep-cloud";

const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY! });

async function main() {
  const { db } = await import('@/db/client');
  const ws = await db.query.workspaces.findFirst();
  if (!ws) process.exit(1);
  
  const nodes = await zep.graph.node.getByGraphId(ws.id, {});
  // Show oil-related nodes
  const oilNodes = nodes.filter(n => 
    /aramco|adnoc|opec|qatar|kuwait|iran|iraq|saudi|oil|energy|petroleum|lukoil|bp|shell|sinopec/i.test(n.name ?? "")
  );
  console.log(`Oil-related nodes: ${oilNodes.length}`);
  oilNodes.forEach(n => console.log(`  [${n.name}] → ${(n.summary ?? "").slice(0, 80)}`));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
