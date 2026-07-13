import { type Request, type Response, type NextFunction } from "express";
import { verifyAccessToken } from "../lib/auth.js";
import { appendFile } from "fs";

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email?: string; phone?: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Avtorizatsiya talab qilinadi" });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub as string, role: payload.role, email: payload.email, phone: payload.phone };
    next();
  } catch {
    res.status(401).json({ error: "Token yaroqsiz yoki muddati o'tgan" });
  }
}

export function requireRole(role: "buyer" | "provider") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: "Ruxsat yo'q" });
      return;
    }
    next();
  };
}
