import { db, pricingTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const tiers = [
  { key: "new_provider", nameUz: "Yangi ijrochi", nameRu: "Новый исполнитель", credits: 10, bonusTokens: 0, priceSom: 39000, sortOrder: 0 },
  { key: "start", nameUz: "Hormang START", nameRu: "Hormang START", credits: 25, bonusTokens: 5, priceSom: 89000, sortOrder: 1 },
  { key: "best", nameUz: "Hormang BEST", nameRu: "Hormang BEST", credits: 60, bonusTokens: 15, priceSom: 199000, sortOrder: 2 },
  { key: "pro", nameUz: "Hormang PRO", nameRu: "Hormang PRO", credits: 150, bonusTokens: 50, priceSom: 399000, sortOrder: 3 },
];

async function main() {
  for (const tier of tiers) {
    const [existing] = await db
      .select({ id: pricingTiersTable.id })
      .from(pricingTiersTable)
      .where(eq(pricingTiersTable.key, tier.key))
      .limit(1);

    if (existing) {
      await db.update(pricingTiersTable).set(tier).where(eq(pricingTiersTable.key, tier.key));
      console.log(`Updated tier: ${tier.key}`);
    } else {
      await db.insert(pricingTiersTable).values(tier);
      console.log(`Inserted tier: ${tier.key}`);
    }
  }
  console.log("Done seeding pricing tiers.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
