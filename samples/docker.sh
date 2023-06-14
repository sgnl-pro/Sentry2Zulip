#!/usr/bin/env bash

PORT=18080
DENO_VERSION=1.22.0
TARGET=https://raw.githubusercontent.com/sgnl-pro/Sentry2Zulip/main/main.ts



docker run --restart=unless-stopped \
    --env SERVER_PORT=$PORT \
    --env ZULIP_DOMAIN=example.zulipchat.com \
    --env ZULIP_BOT_EMAIL=ZULIP_BOT_EMAIL=example@zulipchat.com \
    --env ZULIP_BOT_APIKEY=exampleKey123456789 \
    --env ZULIP_STREAM=streamName \
    --init \
    -p $PORT:$PORT \
    denoland/deno:$DENO_VERSION \
    run --allow-all $TARGET
