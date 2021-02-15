import { serve } from "https://deno.land/std@0.87.0/http/mod.ts";
import { Bot } from "https://deno.land/x/telegram@v0.1.1/mod.ts";
import { Env } from "https://deno.land/x/env@v2.1.2/env.js";

const {
  SERVER_PORT,
  TELEGRAM_TOKEN,
  BACKEND_DEV_CHAT_ID,
  FRONTEND_DEV_CHAT_ID,
  BACKEND_PROD_CHAT_ID,
  FRONTEND_PROD_CHAT_ID,
  OTHER_CHAT_ID,
  BACKEND_PLATFORM,
  FRONTEND_PLATFORM,
  // deno-lint-ignore no-explicit-any
} = new Env().required as any;

interface SentryMessageDto {
  data: {
    event?: SentryEventData;
    error?: SentryEventData;
  };
}

interface SentryEventData {
  release: string;
  platform: string;
  message: string;
  datetime: string;
  environment: string;
  title: string;
  // deno-lint-ignore camelcase
  web_url: string;
}

const server = serve({ port: parseInt(SERVER_PORT) });
console.log(`Starting server at http://localhost:${SERVER_PORT}/`);

const bot = new Bot(TELEGRAM_TOKEN);
bot.launch();

const escapeString = (s?: string) => {
  if (!s) {
    return "";
  }
  const lookup: { [name: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  };
  return s.replace(/[&<>]/g, (c: string) => lookup[c]);
};

const includes = (stack: string, needle: string) =>
  stack.toLowerCase().includes(needle.toLowerCase());

const getChatId = (m: SentryEventData) => {
  if (includes(BACKEND_PLATFORM, m.platform)) {
    if (includes(m.environment, "dev")) {
      return BACKEND_DEV_CHAT_ID;
    }
    if (includes(m.environment, "prod")) {
      return BACKEND_PROD_CHAT_ID;
    }
  }
  if (includes(FRONTEND_PLATFORM, m.platform)) {
    if (includes(m.environment, "dev")) {
      return FRONTEND_DEV_CHAT_ID;
    }
    if (includes(m.environment, "prod")) {
      return FRONTEND_PROD_CHAT_ID;
    }
  }
  return OTHER_CHAT_ID;
};
const formatMessage = (m: SentryEventData, isNew: boolean) => {
  let text = `<b>${isNew ? "🟥" : "🟧"}     ${m.release} (${m.environment}) </b>`;
  text += `\n\n\n${escapeString(m.title)}`;
  text += `\n${escapeString(m.message)}`;
  text += `\n\n\n  ${m.datetime.toString()}`;
  text +=
    `\n<a href='${m.web_url}'>➕➖➖➖➖➖➖➖➖➕\n➕➖➖open SENTRY➖➖➕\n➕➖➖➖➖➖➖➖➖➕</a>`;
  return text;
};

for await (const req of server) {
  let message: SentryMessageDto;
  let event: SentryEventData;
  let isNew = false;

  try {
    if (req.method !== "POST") {
      throw Error("Unknown method");
    }
    const buf = await Deno.readAll(req.body);
    const txt = new TextDecoder("utf8").decode(buf);
    message = JSON.parse(txt) as SentryMessageDto;
    if (message.data.error) {
      isNew = true;
      event = message.data.error;
    } else if (message.data.event) {
      isNew = false;
      event = message.data.event;
    } else {
      throw Error("Sentry data message error");
    }
  } catch (error) {
    req.respond({ body: `Request error: ${error.message}`, status: 400 });
    continue;
  }

  try {
    await bot.telegram.sendMessage({
      chat_id: getChatId(event),
      text: formatMessage(event, isNew),
      parse_mode: "HTML",
    });
    req.respond({ status: 204 });
  } catch (error) {
    req.respond({ body: `Bot error: ${error.message}`, status: 500 });
  }
}
