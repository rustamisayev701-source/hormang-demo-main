import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import walletRouter from "./wallet";
import paymentsRouter from "./payments";
import categoriesRouter from "./categories";
import announcementsRouter from "./announcements";
import adminPricingRouter from "./admin-pricing";
import adminWalletsRouter from "./admin-wallets";
import adminUsersRouter from "./admin-users";
import adminAuditLogRouter from "./admin-audit-log";
import reportsRouter from "./reports";
import feedbackRouter from "./feedback";
import badgesRouter from "./badges";
import requestsRouter from "./requests";
import offersRouter from "./offers";
import chatsRouter from "./chats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/wallet", walletRouter);
router.use("/payments", paymentsRouter);
router.use("/categories", categoriesRouter);
router.use("/announcements", announcementsRouter);
router.use("/reports", reportsRouter);
router.use("/feedback", feedbackRouter);
router.use("/badges", badgesRouter);
router.use("/requests", requestsRouter);
router.use("/offers", offersRouter);
router.use("/chats", chatsRouter);
router.use("/admin/pricing-tiers", adminPricingRouter);
router.use("/admin/wallets", adminWalletsRouter);
router.use("/admin/users", adminUsersRouter);
router.use("/admin/audit-log", adminAuditLogRouter);

export default router;
