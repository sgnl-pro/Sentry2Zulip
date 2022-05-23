import { serve } from "https://deno.land/std@0.140.0/http/mod.ts";
import { Bot } from "https://deno.land/x/grammy@v1.8.3/mod.ts";
import { Env } from "https://deno.land/x/env@v2.2.0/env.js";

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

const bot = new Bot(TELEGRAM_TOKEN);
bot.start();

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
    `\n<a href='${m.web_url}'>➕➖➖➖➖➖➖➖➖➕\n➕➖  OPEN SENTRY  ➖➖➕\n➕➖➖➖➖➖➖➖➖➕</a>`;
  return text;
};

await serve(async (req) => {
  let message: SentryMessageDto;
  let event: SentryEventData;
  let isNew = false;

  try {
    if (req.method !== "POST") {
      return new Response(`Method Not Allowed`, { status: 405 });
    }
    const json = await req.json();
    message = json as SentryMessageDto;
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
    return new Response(`Request error: ${error.message}`, { status: 400 });
  }

  try {
    await bot.api.sendMessage(getChatId(event), formatMessage(event, isNew), {
      parse_mode: "HTML",
    });
    return new Response("", { status: 204 });
  } catch (error) {
    return new Response(`Bot error: ${error.message}`, { status: 500 });
  }
}, {
  port: parseInt(SERVER_PORT),
  onListen: ({ port, hostname }) => {
    console.log(`Starting server at ${hostname}:${port}/`);
  },
});
