import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  walletsTable,
  pricingTiersTable,
  tangaTransactionsTable,
  paymentOrdersTable,
} from "@workspace/db";
import type { AuthRequest } from "../middlewares/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import { buildPaymeCheckoutUrl } from "../lib/payme.js";
import { isPaymeConfigured } from "../lib/env.js";

const router: IRouter = Router();

// ─── GET / — balance + purchasable tiers ───────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    let [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet) {
      [wallet] = await db.insert(walletsTable).values({ userId, balance: 0 }).returning();
    }

    const tiers = await db
      .select()
      .from(pricingTiersTable)
      .where(eq(pricingTiersTable.active, true))
      .orderBy(pricingTiersTable.sortOrder);

    res.json({ balance: wallet.balance, tiers });
  } catch (err) {
    console.error("Get wallet error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /transactions — Tanga ledger ──────────────────────────────────────
router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const transactions = await db
      .select()
      .from(tangaTransactionsTable)
      .where(eq(tangaTransactionsTable.userId, req.user!.id))
      .orderBy(desc(tangaTransactionsTable.createdAt));

    res.json({ transactions });
  } catch (err) {
    console.error("Get wallet transactions error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST /orders — start a purchase, returns the gateway checkout URL ─────
router.post("/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { tierId, provider } = req.body as { tierId?: string; provider?: string };

    if (!tierId || !provider) {
      res.status(400).json({ error: "tierId va provider talab qilinadi" });
      return;
    }
    if (provider !== "payme") {
      res.status(400).json({ error: "Bu to'lov usuli hali mavjud emas" });
      return;
    }
    if (!isPaymeConfigured()) {
      res.status(503).json({ error: "To'lov tizimi hali sozlanmagan" });
      return;
    }

    const [tier] = await db.select().from(pricingTiersTable).where(eq(pricingTiersTable.id, tierId)).limit(1);
    if (!tier || !tier.active) {
      res.status(404).json({ error: "Tarif topilmadi" });
      return;
    }

    const [order] = await db
      .insert(paymentOrdersTable)
      .values({
        userId: req.user!.id,
        tierId: tier.id,
        provider: "payme",
        amountSom: tier.priceSom,
        status: "pending",
      })
      .returning();

    const checkoutUrl = buildPaymeCheckoutUrl(order);
    res.status(201).json({ orderId: order.id, checkoutUrl });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /orders/:id — poll order status (used by the post-checkout return page) ──
router.get("/orders/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = req.params.id as string;
    const [row] = await db
      .select({ order: paymentOrdersTable, tier: pricingTiersTable })
      .from(paymentOrdersTable)
      .innerJoin(pricingTiersTable, eq(paymentOrdersTable.tierId, pricingTiersTable.id))
      .where(eq(paymentOrdersTable.id, orderId))
      .limit(1);

    if (!row || row.order.userId !== req.user!.id) {
      res.status(404).json({ error: "Buyurtma topilmadi" });
      return;
    }

    res.json({ order: row.order, tier: row.tier });
  } catch (err) {
    console.error("Get order error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

export default router;
