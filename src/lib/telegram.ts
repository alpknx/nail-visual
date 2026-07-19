const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

interface InlineButton {
  text: string;
  callback_data: string;
}

async function callTelegramApi(method: string, body: Record<string, unknown>) {
  if (!API_BASE) {
    console.warn(`TELEGRAM_BOT_TOKEN not set - skipping Telegram API call: ${method}`);
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`Telegram API ${method} failed`, data);
    }
    return data;
  } catch (error) {
    console.error(`Telegram API ${method} threw`, error);
    return null;
  }
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  buttons?: InlineButton[][]
) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  });
}

export async function answerTelegramCallback(callbackQueryId: string, text?: string) {
  return callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export function telegramDeepLink(botUsername: string, bookingId: string) {
  return `https://t.me/${botUsername}?start=${bookingId}`;
}
