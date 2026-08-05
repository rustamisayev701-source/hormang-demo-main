import { Router, type IRouter } from "express";
import { and, eq, desc, count } from "drizzle-orm";
import { db, reviewsTable, requestsTable, offersTable, type Review } from "@workspace/db";
import type { AuthRequest } from "../middlewares/auth.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

function toJson(r: Review) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

// ─── GET /user/:userId — reviews + derived stats for one user in one role ──
router.get("/user/:userId", async (req, res) => {
  try {
    const userId: string = String(req.params.userId);
    const role = req.query.role === "customer" ? "customer" : "provider";

    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(and(eq(reviewsTable.reviewedId, userId), eq(reviewsTable.reviewedRole, role)))
      .orderBy(desc(reviewsTable.createdAt));

    const averageRating = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 100) / 100
      : 0;

    let providerMetrics: { serviceQuality: number; providerAttitude: number; servicePrice: number } | undefined;
    if (role === "provider") {
      const withMetrics = reviews.filter((r) => r.serviceQuality != null);
      providerMetrics = withMetrics.length
        ? {
            serviceQuality: withMetrics.reduce((s, r) => s + (r.serviceQuality ?? 0), 0) / withMetrics.length,
            providerAttitude: withMetrics.reduce((s, r) => s + (r.providerAttitude ?? 0), 0) / withMetrics.length,
            servicePrice: withMetrics.reduce((s, r) => s + (r.servicePrice ?? 0), 0) / withMetrics.length,
          }
        : { serviceQuality: 0, providerAttitude: 0, servicePrice: 0 };
    }

    const completedCount =
      role === "provider"
        ? (await db.select({ n: count() }).from(offersTable).where(and(eq(offersTable.masterId, userId), eq(offersTable.status, "completed"))))[0]?.n ?? 0
        : (await db.select({ n: count() }).from(requestsTable).where(and(eq(requestsTable.customerId, userId), eq(requestsTable.status, "completed"))))[0]?.n ?? 0;

    res.json({ reviews: reviews.map(toJson), averageRating, completedCount: Number(completedCount), providerMetrics });
  } catch (err) {
    console.error("List reviews error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /check/:requestId — has the current user already reviewed this job ─
router.get("/check/:requestId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requestId: string = String(req.params.requestId);
    const [existing] = await db
      .select({ id: reviewsTable.id })
      .from(reviewsTable)
      .where(and(eq(reviewsTable.requestId, requestId), eq(reviewsTable.reviewerId, req.user!.id)))
      .limit(1);
    res.json({ reviewed: !!existing });
  } catch (err) {
    console.error("Check review error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST / — leave a review for a completed job ───────────────────────────
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const reviewerId = req.user!.id;
    const body = req.body as {
      requestId?: string; rating?: number; comment?: string; photoUrl?: string;
      serviceQuality?: number; providerAttitude?: number; servicePrice?: number;
      platformSentiment?: "positive" | "negative"; platformFeedback?: string;
    };
    if (!body.requestId || !body.rating || body.rating < 1 || body.rating > 5) {
      res.status(400).json({ error: "requestId va rating (1-5) talab qilinadi" });
      return;
    }

    const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, body.requestId)).limit(1);
    if (!request || request.status !== "completed") {
      res.status(400).json({ error: "So'rov topilmadi yoki hali yakunlanmagan" });
      return;
    }

    let reviewerRole: "customer" | "provider";
    let reviewedId: string;
    let reviewedRole: "customer" | "provider";

    if (request.customerId === reviewerId) {
      if (!request.acceptedOfferId) {
        res.status(400).json({ error: "Qabul qilingan taklif topilmadi" });
        return;
      }
      const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, request.acceptedOfferId)).limit(1);
      if (!offer) {
        res.status(400).json({ error: "Taklif topilmadi" });
        return;
      }
      reviewerRole = "customer";
      reviewedId = offer.masterId;
      reviewedRole = "provider";
    } else {
      const [offer] = await db
        .select()
        .from(offersTable)
        .where(and(eq(offersTable.requestId, body.requestId), eq(offersTable.masterId, reviewerId), eq(offersTable.status, "completed")))
        .limit(1);
      if (!offer || !request.customerId) {
        res.status(403).json({ error: "Siz bu so'rov ishtirokchisi emassiz" });
        return;
      }
      reviewerRole = "provider";
      reviewedId = request.customerId;
      reviewedRole = "customer";
    }

    const [row] = await db
      .insert(reviewsTable)
      .values({
        requestId: body.requestId,
        offerId: request.acceptedOfferId,
        reviewerId,
        reviewerRole,
        reviewedId,
        reviewedRole,
        rating: body.rating,
        comment: body.comment,
        photoUrl: body.photoUrl,
        serviceQuality: reviewedRole === "provider" ? body.serviceQuality : undefined,
        providerAttitude: reviewedRole === "provider" ? body.providerAttitude : undefined,
        servicePrice: reviewedRole === "provider" ? body.servicePrice : undefined,
        platformSentiment: body.platformSentiment,
        platformFeedback: body.platformFeedback,
      })
      .onConflictDoNothing({ target: [reviewsTable.requestId, reviewsTable.reviewerId] })
      .returning();

    if (!row) {
      res.status(409).json({ error: "Siz bu so'rov uchun allaqachon sharh qoldirgansiz" });
      return;
    }

    res.status(201).json({ review: toJson(row) });
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

export default router;
