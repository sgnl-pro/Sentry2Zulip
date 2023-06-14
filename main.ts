import { serve } from "https://deno.land/std@0.191.0/http/mod.ts";
import { Env } from "https://deno.land/x/env@v2.2.3/env.js";

const {
  SERVER_PORT,
  ZULIP_DOMAIN,
  ZULIP_BOT_EMAIL,
  ZULIP_BOT_APIKEY,
  ZULIP_STREAM,
  // deno-lint-ignore no-explicit-any
} = new Env().required as any;

const endpoint = `https://${ZULIP_DOMAIN}/api/v1/messages`;
const credentials = `${ZULIP_BOT_EMAIL}:${ZULIP_BOT_APIKEY}`;

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
  metadata?: {
    filename: string;
    type: string;
    value: string;
  };
}

const composeBody = (m: SentryEventData, json: unknown) => {
  const formData = new URLSearchParams();
  formData.append("type", "stream");
  formData.append("to", ZULIP_STREAM);
  formData.append("topic", m.release.split("@")[0]);
  let content = `============================\n`;
  content += `**[${m.release}](${m.web_url})** `;
  content += `[(${m.environment})](${m.web_url})\n\n`;
  content += "```quote\n";
  content += `**title**:${m.title}\n`;
  content += `**platform**:${m.platform}\n`;
  content += `**environment**: ${m.environment}\n`;
  if (m.metadata) {
    if (m.metadata.type) {
      content += `**${m.metadata.type}**: ${m.metadata.value}\n`;
    }
    if (m.metadata.filename) {
      content += `**filename**: ${m.metadata.filename}\n`;
    }
  }
  content += `**date**: ${m.datetime}\n`;
  content += "```\n\n\n";
  content += `\`\`\`quote${m.message}\`\`\`\n\n`;
  content += "raw data:\n";
  content += "```spoiler" + JSON.stringify(json, null, 2) + "```\n\n";
  formData.append("content", content);

  return formData.toString();
};

await serve(async (req) => {
  let message: SentryMessageDto;
  let event: SentryEventData;

  try {
    if (req.method !== "POST") {
      return new Response(`Method Not Allowed`, { status: 405 });
    }
    const json = await req.json();
    message = json as SentryMessageDto;
    if (message.data.error) {
      event = message.data.error;
    } else if (message.data.event) {
      event = message.data.event;
    } else {
      throw Error("Sentry data message error");
    }
  } catch (error) {
    return new Response(`Request error: ${error.message}`, { status: 400 });
  }

  try {
    const req = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(credentials)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: composeBody(event),
    });
    if (!req.ok) {
      throw Error(`Zulip API error: ${req.statusText}`);
    }
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
