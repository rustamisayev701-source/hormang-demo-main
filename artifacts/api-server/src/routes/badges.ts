import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, userBadgesTable, type UserBadgeRow } from "@workspace/db";
import { requireAdminKey } from "../middlewares/admin.js";

const router: IRouter = Router();

const ADMIN_BADGE_TYPES = ["recommended_by_hormang", "under_review"];

function toJson(row: UserBadgeRow) {
  return { userId: row.userId, type: row.type, grantedAt: row.grantedAt.toISOString(), grantedBy: row.grantedBy };
}

// ─── GET / — every admin-granted badge, public (small, cacheable dataset) ──
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(userBadgesTable);
    res.json({ badges: rows.map(toJson) });
  } catch (err) {
    console.error("List badges error:", err);
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
      .values({ userId, type: type as UserBadgeRow["type"], grantedBy })
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
