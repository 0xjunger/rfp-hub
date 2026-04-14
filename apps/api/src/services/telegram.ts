const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function sendTelegramNotification(text: string): void {
  if (!BOT_TOKEN || !CHAT_ID) return;

  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  }).catch((err) => {
    console.error('[Telegram] Failed to send notification:', err);
  });
}
