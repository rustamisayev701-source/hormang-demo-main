import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, auditLogTable } from "@workspace/db";
import { requireAdminKey } from "../middlewares/admin.js";

const router: IRouter = Router();
router.use(requireAdminKey);

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(auditLogTable).orderBy(desc(auditLogTable.createdAt)).limit(1000);
    res.json({
      log: rows.map((r) => ({
        ...r,
        targetId: r.targetId ?? undefined,
        targetType: r.targetType ?? undefined,
        metadata: r.metadata ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("List audit log error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { actorId, actorRole, action, category, targetId, targetType, description, metadata } = req.body as {
      actorId?: string; actorRole?: string; action?: string; category?: string;
      targetId?: string; targetType?: string; description?: string; metadata?: Record<string, unknown>;
    };
    if (!actorId || !actorRole || !action || !category || !description) {
      res.status(400).json({ error: "actorId, actorRole, action, category, description talab qilinadi" });
      return;
    }
    const [row] = await db
      .insert(auditLogTable)
      .values({ actorId, actorRole, action, category, targetId, targetType, description, metadata })
      .returning();
    res.status(201).json({ entry: { ...row, createdAt: row.createdAt.toISOString() } });
  } catch (err) {
    console.error("Write audit log error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

router.delete("/", async (_req, res) => {
  try {
    await db.delete(auditLogTable);
    res.json({ ok: true });
  } catch (err) {
    console.error("Clear audit log error:", err);
    res.status(500).json({ ok: false });
  }
});

export default router;
