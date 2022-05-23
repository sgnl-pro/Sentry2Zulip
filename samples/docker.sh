#!/usr/bin/env bash

PORT=18080
DENO_VERSION=1.22.0
TARGET=https://raw.githubusercontent.com/sgnl-pro/Sentry2Telegram/main/main.ts



docker run --restart=unless-stopped \
    --env SERVER_PORT=$PORT \
    --env TELEGRAM_TOKEN=12345678:abcdef \
    --env BACKEND_DEV_CHAT_ID=-100abcdef \
    --env FRONTEND_DEV_CHAT_ID=-100abcdef \
    --env BACKEND_PROD_CHAT_ID=-100abcdef \
    --env FRONTEND_PROD_CHAT_ID=-100abcdef \
    --env OTHER_CHAT_ID=-100abcdef \
    --env BACKEND_PLATFORM=csharp \
    --env FRONTEND_PLATFORM=javascript \
    --init \
    -p $PORT:$PORT \
    denoland/deno:$DENO_VERSION \
    run --allow-all $TARGET
