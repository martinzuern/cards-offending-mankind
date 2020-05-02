#!/bin/sh

# Install dependencies from lockfile
yarn install --frozen-lockfile
yarn cache clean

exec "$@"
