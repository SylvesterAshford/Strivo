import { ZepClient } from "@getzep/zep-cloud";

const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY! });

async function main() {
  const { db } = await import('@/db/client');
  const ws = await db.query.workspaces.findFirst();
  if (!ws) process.exit(1);
  
  const nodes = await zep.graph.node.getByGraphId(ws.id, {});
  console.log("Sample node keys:", Object.keys(nodes[0] ?? {}));
  const oilNode = nodes.find(n => n.name?.toLowerCase().includes("aramco") || n.name?.toLowerCase().includes("saudi") || n.name?.toLowerCase().includes("opec"));
  if (oilNode) {
    console.log("\nOil node full object:");
    console.log(JSON.stringify(oilNode, null, 2));
  } else {
    console.log("\nFirst node full:");
    console.log(JSON.stringify(nodes[0], null, 2));
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
