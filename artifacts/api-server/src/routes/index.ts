import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import walletRouter from "./wallet";
import paymentsRouter from "./payments";
import categoriesRouter from "./categories";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/wallet", walletRouter);
router.use("/payments", paymentsRouter);
router.use("/categories", categoriesRouter);

export default router;
