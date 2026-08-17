import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable, categoryQuestionsTable, commonQuestionsTable, type CategoryRow } from "@workspace/db";
import { requireAdminKey } from "../middlewares/admin.js";

const router: IRouter = Router();

function toCategoryJson(row: CategoryRow, questionCount: number) {
  return {
    id: row.id,
    nameLocalized: { uz: row.nameUz, ...(row.nameRu ? { ru: row.nameRu } : {}), ...(row.nameEn ? { en: row.nameEn } : {}) },
    descriptionLocalized:
      row.descriptionUz || row.descriptionRu || row.descriptionEn
        ? {
            ...(row.descriptionUz ? { uz: row.descriptionUz } : {}),
            ...(row.descriptionRu ? { ru: row.descriptionRu } : {}),
            ...(row.descriptionEn ? { en: row.descriptionEn } : {}),
          }
        : undefined,
    emoji: row.emoji,
    icon: row.icon ?? undefined,
    iconFamily: row.iconFamily ?? undefined,
    color: row.color,
    gradient: row.gradient,
    baseCost: row.baseCost,
    active: row.active,
    builtIn: row.builtin,
    parentCategoryId: row.parentCategoryId,
    createdAt: row.createdAt.toISOString(),
    questionCount,
  };
}

async function questionCountFor(categoryId: string): Promise<number> {
  const [row] = await db
    .select({ questions: categoryQuestionsTable.questions })
    .from(categoryQuestionsTable)
    .where(eq(categoryQuestionsTable.categoryId, categoryId))
    .limit(1);
  return Array.isArray(row?.questions) ? row.questions.length : 0;
}

// ─── GET / — all categories, public ────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const [categories, questionRows] = await Promise.all([
      db.select().from(categoriesTable),
      db.select({ categoryId: categoryQuestionsTable.categoryId, questions: categoryQuestionsTable.questions }).from(categoryQuestionsTable),
    ]);
    const countByCategory = new Map(questionRows.map((r) => [r.categoryId, Array.isArray(r.questions) ? r.questions.length : 0]));
    res.json({ categories: categories.map((c) => toCategoryJson(c, countByCategory.get(c.id) ?? 0)) });
  } catch (err) {
    console.error("List categories error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── Common (shared) questions — literal path, must come before /:id ──────
router.get("/common-questions", async (_req, res) => {
  try {
    const [row] = await db.select().from(commonQuestionsTable).where(eq(commonQuestionsTable.id, "singleton")).limit(1);
    res.json({ questions: row?.questions ?? [] });
  } catch (err) {
    console.error("Get common questions error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

router.put("/common-questions", requireAdminKey, async (req, res) => {
  try {
    const { questions } = req.body as { questions?: unknown[] };
    if (!Array.isArray(questions)) {
      res.status(400).json({ error: "questions massiv bo'lishi kerak" });
      return;
    }
    await db
      .insert(commonQuestionsTable)
      .values({ id: "singleton", questions, updatedAt: new Date() })
      .onConflictDoUpdate({ target: commonQuestionsTable.id, set: { questions, updatedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error("Save common questions error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /questions-all — bulk, raw category-specific questions (no merge) ─
// Literal path, must come before /:id/questions.
router.get("/questions-all", async (_req, res) => {
  try {
    const rows = await db.select().from(categoryQuestionsTable);
    const byCategory: Record<string, unknown[]> = {};
    for (const row of rows) byCategory[row.categoryId] = row.questions ?? [];
    res.json({ questionsByCategory: byCategory });
  } catch (err) {
    console.error("Get bulk category questions error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /:id/questions — category-specific + common, merged, public ──────
router.get("/:id/questions", async (req, res) => {
  try {
    const [catQ] = await db
      .select()
      .from(categoryQuestionsTable)
      .where(eq(categoryQuestionsTable.categoryId, req.params.id))
      .limit(1);
    const [common] = await db.select().from(commonQuestionsTable).where(eq(commonQuestionsTable.id, "singleton")).limit(1);
    res.json({ questions: [...(catQ?.questions ?? []), ...(common?.questions ?? [])] });
  } catch (err) {
    console.error("Get category questions error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PUT /:id/questions — replace a category's question set, admin only ───
router.put("/:id/questions", requireAdminKey, async (req, res) => {
  try {
    const categoryId: string = String(req.params.id);
    const { questions } = req.body as { questions?: unknown[] };
    if (!Array.isArray(questions)) {
      res.status(400).json({ error: "questions massiv bo'lishi kerak" });
      return;
    }
    await db
      .insert(categoryQuestionsTable)
      .values({ categoryId, questions, updatedAt: new Date() })
      .onConflictDoUpdate({ target: categoryQuestionsTable.categoryId, set: { questions, updatedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error("Save category questions error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PUT /:id — upsert (create or update) a category, admin only ──────────
router.put("/:id", requireAdminKey, async (req, res) => {
  try {
    const id: string = String(req.params.id);
    const body = req.body as {
      nameLocalized?: { uz?: string; ru?: string; en?: string };
      descriptionLocalized?: { uz?: string; ru?: string; en?: string };
      emoji?: string;
      icon?: string | null;
      iconFamily?: string | null;
      color?: string;
      gradient?: string | null;
      baseCost?: number;
      active?: boolean;
      parentCategoryId?: string | null;
    };

    if (!body.nameLocalized?.uz?.trim()) {
      res.status(400).json({ error: "O'zbekcha nom talab qilinadi" });
      return;
    }

    const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);

    const values = {
      nameUz: body.nameLocalized.uz.trim(),
      nameRu: body.nameLocalized.ru?.trim() || null,
      nameEn: body.nameLocalized.en?.trim() || null,
      descriptionUz: body.descriptionLocalized?.uz?.trim() || null,
      descriptionRu: body.descriptionLocalized?.ru?.trim() || null,
      descriptionEn: body.descriptionLocalized?.en?.trim() || null,
      emoji: body.emoji ?? "📋",
      icon: body.icon ?? null,
      iconFamily: body.iconFamily ?? null,
      color: body.color ?? "#3B82F6",
      gradient: body.gradient ?? null,
      baseCost: body.baseCost ?? 0,
      active: body.active !== false,
      parentCategoryId: body.parentCategoryId ?? null,
      updatedAt: new Date(),
    };

    let row: CategoryRow;
    if (existing) {
      // builtin flag is immutable — never overwritten by an update.
      [row] = await db.update(categoriesTable).set(values).where(eq(categoriesTable.id, id)).returning();
    } else {
      [row] = await db
        .insert(categoriesTable)
        .values({ id, ...values, builtin: false, createdAt: new Date() })
        .returning();
    }

    res.json(toCategoryJson(row, await questionCountFor(id)));
  } catch (err) {
    console.error("Upsert category error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PATCH /:id/active — toggle active, admin only ─────────────────────────
router.patch("/:id/active", requireAdminKey, async (req, res) => {
  try {
    const id: string = String(req.params.id);
    const { active } = req.body as { active?: boolean };
    if (typeof active !== "boolean") {
      res.status(400).json({ error: "active (boolean) talab qilinadi" });
      return;
    }
    const [row] = await db
      .update(categoriesTable)
      .set({ active, updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Kategoriya topilmadi" });
      return;
    }
    res.json(toCategoryJson(row, await questionCountFor(row.id)));
  } catch (err) {
    console.error("Toggle category active error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── DELETE /:id — permanent delete (including built-in), admin only ──────
router.delete("/:id", requireAdminKey, async (req, res) => {
  try {
    const id: string = String(req.params.id);
    const [row] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ ok: false, reason: "not_found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

export default router;
