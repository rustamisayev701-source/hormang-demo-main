import { Router, type IRouter } from "express";
import { handlePaymeRequest } from "../lib/payme.js";
import { handleClickPrepare, handleClickComplete } from "../lib/click.js";

const router: IRouter = Router();

// Payme's servers call this directly — no user auth, verified via Basic auth + PAYME_KEY instead.
router.post("/payme", async (req, res) => {
  const result = await handlePaymeRequest(req.headers.authorization, req.body);
  res.json(result);
});

// Click's servers call these directly (form-urlencoded) — no user auth,
// verified via the MD5 sign_string instead. Configured as separate "Prepare
// URL" / "Complete URL" fields in the Click Business merchant cabinet.
router.post("/click/prepare", async (req, res) => {
  const result = await handleClickPrepare(req.body);
  res.json(result);
});

router.post("/click/complete", async (req, res) => {
  const result = await handleClickComplete(req.body);
  res.json(result);
});

export default router;
