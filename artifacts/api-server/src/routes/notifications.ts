import { Router, type IRouter } from "express";
import { eq, desc, or, isNull } from "drizzle-orm";
import { db, notificationsTable, type NotificationRow } from "@workspace/db";
import { requireAdminKey } from "../middlewares/admin.js";

const router: IRouter = Router();

function toJson(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    target: row.target,
    announcementId: row.announcementId ?? undefined,
    type: row.type,
    title: row.titleUz,
    titleLocalized: {
      uz: row.titleUz,
      ru: row.titleRu ?? undefined,
      en: row.titleEn ?? undefined,
    },
    content: row.contentUz,
    contentLocalized: {
      uz: row.contentUz,
      ru: row.contentRu ?? undefined,
      en: row.contentEn ?? undefined,
    },
    ctaText: row.ctaTextUz ?? undefined,
    ctaTextLocalized: {
      uz: row.ctaTextUz ?? undefined,
      ru: row.ctaTextRu ?? undefined,
      en: row.ctaTextEn ?? undefined,
    },
    ctaLink: row.ctaLink ?? undefined,
    image: row.image ?? undefined,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

interface CreateNotificationBody {
  userId?: string;
  target?: "all" | "providers" | "customers";
  type?: "news" | "event" | "system" | "offer" | "request";
  titleUz: string;
  titleRu?: string;
  titleEn?: string;
  contentUz: string;
  contentRu?: string;
  contentEn?: string;
  ctaTextUz?: string;
  ctaTextRu?: string;
  ctaTextEn?: string;
  ctaLink?: string;
  image?: string;
}

// ─── GET / — Get notifications ─────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const role = (req.query.role as string) || "all";
    const userId = req.query.userId as string | undefined;

    let query = db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt));

    const rows = await query;
    // Filter rows based on target role and userId
    const filtered = rows.filter((r) => {
      if (r.userId && userId && r.userId !== userId) return false;
      if (r.target === "all") return true;
      if (role === "admin") return true;
      if (r.target === "providers" && role === "provider") return true;
      if (r.target === "customers" && (role === "buyer" || role === "customer")) return true;
      return false;
    });

    res.json({ notifications: filtered.map(toJson) });
  } catch (err) {
    console.error("List notifications error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PATCH /:id/read — Mark single notification as read ─────────────────────
router.patch("/:id/read", async (req, res) => {
  try {
    const id = String(req.params.id);
    const [row] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Notification topilmadi" });
      return;
    }
    res.json({ notification: toJson(row) });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST /read-all — Mark all as read ──────────────────────────────────────
router.post("/read-all", async (_req, res) => {
  try {
    await db.update(notificationsTable).set({ isRead: true });
    res.json({ ok: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST /send — Send custom notification (Admin) ─────────────────────────
router.post("/send", requireAdminKey, async (req, res) => {
  try {
    const body = req.body as CreateNotificationBody;
    if (!body.titleUz?.trim() || !body.contentUz?.trim()) {
      res.status(400).json({ error: "titleUz va contentUz talab qilinadi" });
      return;
    }

    const [row] = await db
      .insert(notificationsTable)
      .values({
        userId: body.userId || null,
        target: body.target || "all",
        type: body.type || "news",
        titleUz: body.titleUz.trim(),
        titleRu: body.titleRu?.trim() || null,
        titleEn: body.titleEn?.trim() || null,
        contentUz: body.contentUz.trim(),
        contentRu: body.contentRu?.trim() || null,
        contentEn: body.contentEn?.trim() || null,
        ctaTextUz: body.ctaTextUz?.trim() || null,
        ctaTextRu: body.ctaTextRu?.trim() || null,
        ctaTextEn: body.ctaTextEn?.trim() || null,
        ctaLink: body.ctaLink?.trim() || null,
        image: body.image?.trim() || null,
      })
      .returning();

    res.status(201).json({ notification: toJson(row) });
  } catch (err) {
    console.error("Send custom notification error:", err);
    res.status(500).json({ error: "Notification yuborishda xatolik" });
  }
});

// ─── DELETE /:id — Delete notification (Admin) ──────────────────────────────
router.delete("/:id", requireAdminKey, async (req, res) => {
  try {
    const id = String(req.params.id);
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ ok: false });
  }
});

export default router;
