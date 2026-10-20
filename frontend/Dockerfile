# VITE_* values are baked into the browser bundle at build time, so they are build args.
# VITE_API_URL is the backend URL as seen from the user's browser, not from this container.
FROM oven/bun:1.3 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_API_URL=http://localhost:8000
ARG VITE_USE_MOCK=false
# The Lovable config defaults to a Cloudflare build; target a plain Node server instead.
ENV VITE_API_URL=$VITE_API_URL VITE_USE_MOCK=$VITE_USE_MOCK NITRO_PRESET=node-server
RUN bun run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
