import { Router, type IRouter } from "express";
import { handlePaymeRequest } from "../lib/payme.js";

const router: IRouter = Router();

// Payme's servers call this directly — no user auth, verified via Basic auth + PAYME_KEY instead.
router.post("/payme", async (req, res) => {
  const result = await handlePaymeRequest(req.headers.authorization, req.body);
  res.json(result);
});

export default router;
