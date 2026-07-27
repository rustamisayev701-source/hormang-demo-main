import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import walletRouter from "./wallet";
import paymentsRouter from "./payments";
import categoriesRouter from "./categories";
import adminPricingRouter from "./admin-pricing";
import adminWalletsRouter from "./admin-wallets";
import adminUsersRouter from "./admin-users";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/wallet", walletRouter);
router.use("/payments", paymentsRouter);
router.use("/categories", categoriesRouter);
router.use("/admin/pricing-tiers", adminPricingRouter);
router.use("/admin/wallets", adminWalletsRouter);
router.use("/admin/users", adminUsersRouter);

export default router;
