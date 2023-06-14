import { serve } from "https://deno.land/std@0.191.0/http/mod.ts";
import { Env } from "https://deno.land/x/env@v2.2.3/env.js";

const {
  SERVER_PORT,
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
  metadata?: {
    filename: string;
    type: string;
    value: string;
  };
}

const req = await fetch(`http://127.0.0.1:${SERVER_PORT}`, {
  method: "POST",
  body: JSON.stringify({
    data: {
      event: {
        release: "backup-server@v1.3.23",
        platform: "platform",
        message: "System.Exception: Forge token 3 request error",
        datetime: "2023-06-14T12:00:10.274633Z",
        environment: "production",
        title: "title",
        // deno-lint-ignore camelcase
        web_url: "https://web_url",
        metadata: {
          filename: "filename",
          type: "type",
          value: "value",
        },
      },
    },
  }),
});
