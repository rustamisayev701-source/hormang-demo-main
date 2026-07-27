import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, feedbacksTable, type FeedbackRow } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { requireAdminKey } from "../middlewares/admin.js";

const router: IRouter = Router();

function toJson(row: FeedbackRow) {
  return { ...row, attachments: row.attachments ?? [], createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

// ─── POST / — submit feedback as the authenticated user ────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const body = req.body as {
      userRole?: "customer" | "provider"; type?: string; title?: string; description?: string;
      targetType?: string; targetId?: string; problemArea?: string; suggestionCategory?: string;
      relatedRequestId?: string; attachments?: string[];
    };
    if (!body.userRole || !body.type || !body.title?.trim() || !body.description?.trim()) {
      res.status(400).json({ error: "userRole, type, title, description talab qilinadi" });
      return;
    }
    const [row] = await db
      .insert(feedbacksTable)
      .values({
        userId,
        userRole: body.userRole,
        type: body.type as FeedbackRow["type"],
        title: body.title.trim(),
        description: body.description.trim(),
        targetType: body.targetType ?? null,
        targetId: body.targetId ?? null,
        problemArea: body.problemArea ?? null,
        suggestionCategory: body.suggestionCategory ?? null,
        relatedRequestId: body.relatedRequestId ?? null,
        attachments: body.attachments ?? [],
      })
      .returning();
    res.status(201).json({ feedback: toJson(row) });
  } catch (err) {
    console.error("Submit feedback error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /mine — the authenticated user's own feedback history ─────────────
router.get("/mine", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(feedbacksTable)
      .where(eq(feedbacksTable.userId, req.user!.id))
      .orderBy(desc(feedbacksTable.createdAt));
    res.json({ feedbacks: rows.map(toJson) });
  } catch (err) {
    console.error("Get own feedback error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /admin — every feedback entry, admin only ──────────────────────────
router.get("/admin", requireAdminKey, async (_req, res) => {
  try {
    const rows = await db.select().from(feedbacksTable).orderBy(desc(feedbacksTable.createdAt));
    res.json({ feedbacks: rows.map(toJson) });
  } catch (err) {
    console.error("List feedback error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PATCH /admin/:id — update status/priority/notes, admin only ──────────
router.patch("/admin/:id", requireAdminKey, async (req, res) => {
  try {
    const id: string = String(req.params.id);
    const { status, priority, adminNote, rejectionReason } = req.body as {
      status?: string; priority?: string; adminNote?: string; rejectionReason?: string;
    };
    const [row] = await db
      .update(feedbacksTable)
      .set({
        ...(status ? { status: status as FeedbackRow["status"] } : {}),
        ...(priority ? { priority: priority as FeedbackRow["priority"] } : {}),
        ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
        ...(rejectionReason !== undefined ? { rejectionReason: rejectionReason || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(feedbacksTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Murojaat topilmadi" });
      return;
    }
    res.json({ feedback: toJson(row) });
  } catch (err) {
    console.error("Update feedback error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

export default router;
