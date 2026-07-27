import { type Request, type Response, type NextFunction } from "express";
import { getAdminApiKey } from "../lib/env.js";

export function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-admin-key"];
  if (typeof key !== "string" || key !== getAdminApiKey()) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }
  next();
}
