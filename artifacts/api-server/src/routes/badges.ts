import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, userBadgesTable, type UserBadgeRow } from "@workspace/db";
import { requireAdminKey } from "../middlewares/admin.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

const ADMIN_BADGE_TYPES = ["recommended_by_hormang", "under_review"];
const AUTO_BADGE_TYPES = [
  "top_provider", "trusted_provider", "verified",
  "experienced_provider", "premium_provider", "strong_portfolio",
];

function toJson(row: UserBadgeRow) {
  return { userId: row.userId, type: row.type, source: row.source, grantedAt: row.grantedAt.toISOString(), grantedBy: row.grantedBy };
}

// ─── GET / — every badge (admin + auto), public (small, cacheable dataset) ──
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(userBadgesTable);
    res.json({ badges: rows.map(toJson) });
  } catch (err) {
    console.error("List badges error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST /sync — self-service sync of the caller's auto-evaluated badges.
// The client computes eligibility (still partly from the owner's own local
// profile data) and posts the resulting set; this just persists the diff so
// the result is visible to every viewer/device, not just the owner's browser. ─
router.post("/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { qualified } = req.body as { qualified?: string[] };
    if (!Array.isArray(qualified) || qualified.some((t) => !AUTO_BADGE_TYPES.includes(t))) {
      res.status(400).json({ error: "qualified — avtomatik nishon turlari ro'yxati bo'lishi kerak" });
      return;
    }
    const userId = req.user!.id;

    const existing = await db
      .select()
      .from(userBadgesTable)
      .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.source, "auto")));
    const existingTypes = new Set(existing.map((r) => r.type));
    const qualifiedSet = new Set(qualified);

    const toAdd = qualified.filter((t) => !existingTypes.has(t as UserBadgeRow["type"]));
    const toRemove = existing.filter((r) => !qualifiedSet.has(r.type));

    if (toAdd.length) {
      await db
        .insert(userBadgesTable)
        .values(toAdd.map((type) => ({ userId, type: type as UserBadgeRow["type"], source: "auto" as const, grantedBy: "system" })))
        .onConflictDoNothing({ target: [userBadgesTable.userId, userBadgesTable.type] });
    }
    for (const row of toRemove) {
      await db.delete(userBadgesTable).where(eq(userBadgesTable.id, row.id));
    }

    const rows = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId));
    res.json({ badges: rows.map(toJson) });
  } catch (err) {
    console.error("Sync auto badges error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST /admin — grant an admin badge ─────────────────────────────────────
router.post("/admin", requireAdminKey, async (req, res) => {
  try {
    const { userId, type, grantedBy } = req.body as { userId?: string; type?: string; grantedBy?: string };
    if (!userId || !type || !ADMIN_BADGE_TYPES.includes(type) || !grantedBy) {
      res.status(400).json({ error: "userId, type (admin badge), grantedBy talab qilinadi" });
      return;
    }
    const [existing] = await db
      .select()
      .from(userBadgesTable)
      .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.type, type as UserBadgeRow["type"])))
      .limit(1);
    if (existing) {
      res.status(400).json({ error: "Bu nishon allaqachon berilgan" });
      return;
    }
    const [row] = await db
      .insert(userBadgesTable)
      .values({ userId, type: type as UserBadgeRow["type"], source: "admin", grantedBy })
      .returning();
    res.status(201).json({ badge: toJson(row) });
  } catch (err) {
    console.error("Grant badge error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── DELETE /admin/:userId/:type — remove an admin badge ───────────────────
router.delete("/admin/:userId/:type", requireAdminKey, async (req, res) => {
  try {
    const userId: string = String(req.params.userId);
    const type: string = String(req.params.type);
    const [row] = await db
      .delete(userBadgesTable)
      .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.type, type as UserBadgeRow["type"])))
      .returning();
    if (!row) {
      res.status(404).json({ ok: false });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Remove badge error:", err);
    res.status(500).json({ ok: false });
  }
});

export default router;
