import { Router, type IRouter } from "express";
import { requireAdminKey } from "../middlewares/admin.js";

const router: IRouter = Router();
router.use(requireAdminKey);

/**
 * Google's public web-translate endpoint (translate.googleapis.com) was the
 * first choice — free, no key, best quality for Uzbek — but it flat-out
 * blocks this server's IP with a bot-detection page (confirmed by hand:
 * every request comes back "Sorry... automated queries", never a real
 * translation), which is a known issue for datacenter/VDS IP ranges. Using
 * MyMemory instead: also free/keyless, officially documented (so it won't
 * vanish without notice like an unofficial endpoint could), works from this
 * server. Quality is noticeably behind Google's for Uzbek but still useful
 * as an editable first draft for admins to correct.
 */
async function translateOne(text: string, target: "ru" | "en"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=uz|${target}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upstream translate error: ${res.status}`);

  const data = (await res.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
  if (data.responseStatus && data.responseStatus !== 200) return "";
  return data.responseData?.translatedText ?? "";
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
