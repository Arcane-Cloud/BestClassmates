import "./env";
import { getDb } from "../lib/db";
import { demoPeople } from "../lib/demo-data";
import { personSchema } from "../lib/validation";

async function main() {
  const db = getDb();
  try {
    const data = demoPeople.map((person) => ({ ...personSchema.parse(person), slug: person.slug }));
    const inserted = await db.person.createMany({ data, skipDuplicates: true });
    console.log(`已添加 ${inserted.count} 位虚构演示人物；现有资料未被覆盖。`);
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
