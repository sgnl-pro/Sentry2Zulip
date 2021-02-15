#!/usr/bin/env bash

if test -f ".env"; then
    export $(grep -v '^#' .env | xargs -d '\n')
fi


deno run \
    --unstable \
    --watch \
    --allow-net \
    --allow-env \
    main.ts