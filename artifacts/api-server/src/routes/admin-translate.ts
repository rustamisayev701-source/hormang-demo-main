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
function createTimeoutController(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, cleanup: () => clearTimeout(timer) };
}

async function translateWithGoogle(text: string, target: "ru" | "en"): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=uz&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const { controller, cleanup } = createTimeoutController(7000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Google translate status: ${res.status}`);
    const data = (await res.json()) as unknown;
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const parts = data[0].map((item: unknown) => (Array.isArray(item) && typeof item[0] === "string" ? item[0] : ""));
      return parts.join("");
    }
    return "";
  } finally {
    cleanup();
  }
}

async function translateChunkMyMemory(text: string, target: "ru" | "en"): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=uz|${target}`;
  const { controller, cleanup } = createTimeoutController(7000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`MyMemory status: ${res.status}`);
    const data = (await res.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
    if (data.responseStatus && data.responseStatus !== 200) return "";
    return data.responseData?.translatedText ?? "";
  } finally {
    cleanup();
  }
}

async function translateWithMyMemory(text: string, target: "ru" | "en"): Promise<string> {
  if (text.length <= 400) {
    return translateChunkMyMemory(text, target);
  }
  const regex = /[^.!?\n]+[.!?\n]*/g;
  const matches = text.match(regex) || [text];
  const chunks: string[] = [];
  let cur = "";
  for (const m of matches) {
    if ((cur + m).length > 380) {
      if (cur) chunks.push(cur);
      cur = m;
    } else {
      cur += m;
    }
  }
  if (cur) chunks.push(cur);

  const results: string[] = [];
  for (const c of chunks) {
    const res = await translateChunkMyMemory(c, target);
    results.push(res || c);
  }
  return results.join(" ");
}

async function translateOne(text: string, target: "ru" | "en"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // 1. First priority: Google GTX (high accuracy, preserves sentences & formatting)
  try {
    const gResult = await translateWithGoogle(trimmed, target);
    if (gResult && gResult.trim()) return gResult.trim();
  } catch (err) {
    console.warn("[AdminTranslate] Google GTX failed, attempting MyMemory fallback:", err);
  }

  // 2. Fallback: MyMemory with smart sentence chunking (under 400 chars query limit)
  try {
    const mResult = await translateWithMyMemory(trimmed, target);
    if (mResult && mResult.trim()) return mResult.trim();
  } catch (err) {
    console.warn("[AdminTranslate] MyMemory fallback failed:", err);
  }

  return "";
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
