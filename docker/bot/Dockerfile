# syntax=docker/dockerfile:1
# Builds tf2autobot-pricedb from GitHub (no sibling clone required).
# Override BOT_REPO / BOT_REF build-args to pin a fork or tag.

ARG NODE_VERSION=22-alpine
ARG BOT_REPO=https://github.com/uwu6967/tf2autobot-pricedb.git
ARG BOT_REF=master

FROM node:${NODE_VERSION} AS builder

RUN apk add --no-cache git patch

ARG BOT_REPO
ARG BOT_REF

WORKDIR /src

RUN git clone --depth 1 --branch "${BOT_REF}" "${BOT_REPO}" .

COPY patches/fix-bulkAddFilters-types.patch /patches/
RUN patch -p1 < /patches/fix-bulkAddFilters-types.patch

RUN npm ci && npm run build

FROM node:${NODE_VERSION}

WORKDIR /app

ENV NODE_ENV=production \
    DOCKER=1

COPY --from=builder /src/package.json /src/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /src/dist ./dist

VOLUME ["/app/files", "/app/logs"]

ENTRYPOINT ["node", "/app/dist/app.js"]
