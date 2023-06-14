#!/usr/bin/env bash

if test -f ".env"; then
    export $(grep -v '^#' .env | xargs -d '\n')
fi


deno run \
    --allow-net \
    --allow-env \
    test.ts