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

export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrl: string,
  caption: string,
  buttons?: InlineButton[][]
) {
  return callTelegramApi("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
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

/**
 * Replaces a message's text and removes its inline keyboard (or swaps in new
 * buttons). Used right after handling a callback so a Confirm/Cancel/rating
 * button can't be tapped again on a message that's already been acted on.
 */
export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  buttons?: InlineButton[][]
) {
  return callTelegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons ?? [] },
  });
}

/**
 * Same as editTelegramMessage, but for messages sent via sendTelegramPhoto -
 * Telegram rejects editMessageText on a photo message ("there is no text in
 * the message to edit"), so photo-based cards must use editMessageCaption
 * instead. Silently failing here (as callTelegramApi does on any API error)
 * previously left Confirm/Cancel clickable forever on photo cards.
 */
export async function editTelegramCaption(
  chatId: string | number,
  messageId: number,
  caption: string,
  buttons?: InlineButton[][]
) {
  return callTelegramApi("editMessageCaption", {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons ?? [] },
  });
}

export function telegramDeepLink(botUsername: string, bookingId: string) {
  return `https://t.me/${botUsername}?start=${bookingId}`;
}
