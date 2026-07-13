import app from "./app";
import { startTelegramBot, startLowBalanceScheduler } from "./lib/telegram.js";
import { isTelegramConfigured } from "./lib/env.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

if (isTelegramConfigured()) {
  startTelegramBot();
  startLowBalanceScheduler();
} else {
  console.log("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.");
}
