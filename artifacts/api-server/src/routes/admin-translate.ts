import { Router, type IRouter } from "express";
import { requireAdminKey } from "../middlewares/admin.js";

const router: IRouter = Router();
router.use(requireAdminKey);

/**
 * Uses Google's public web-translate endpoint (the same unauthenticated one
 * translate.google.com's frontend calls) — no API key, no cost, best
 * available quality for Uzbek among the free options. Unofficial: no SLA,
 * can be rate-limited or change shape without notice. Server-side only, both
 * to dodge browser CORS and to keep this implementation detail out of the
 * client bundle.
 */
async function translateOne(text: string, target: "ru" | "en"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=uz&tl=${target}&dt=t&q=${encodeURIComponent(trimmed)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upstream translate error: ${res.status}`);

  const data = (await res.json()) as unknown;
  const segments = Array.isArray(data) ? (data[0] as unknown[] | undefined) : undefined;
  if (!Array.isArray(segments)) return "";

  return segments
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : ""))
    .join("");
}

// ─── POST / — batch-translate a list of Uzbek strings to one target language ─
router.post("/", async (req, res) => {
  try {
    const { texts, target } = req.body as { texts?: unknown; target?: string };

    if (!Array.isArray(texts) || texts.length === 0) {
      res.status(400).json({ error: "texts talab qilinadi" });
      return;
    }
    if (texts.length > 50) {
      res.status(400).json({ error: "Bir vaqtda 50 tadan ko'p matn tarjima qilib bo'lmaydi" });
      return;
    }
    if (target !== "ru" && target !== "en") {
      res.status(400).json({ error: "Noto'g'ri target til" });
      return;
    }

    const translations = await Promise.all(
      texts.map((t) => translateOne(typeof t === "string" ? t : "", target)),
    );

    res.json({ translations });
  } catch (err) {
    console.error("Admin translate error:", err);
    res.status(502).json({ error: "Tarjima xizmatida xatolik yuz berdi. Qayta urinib ko'ring." });
  }
});

export default router;
