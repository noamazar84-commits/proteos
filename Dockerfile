FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install --prefix /opt/pnpm pnpm@10.34.6
ENV PATH="/opt/pnpm/node_modules/.bin:${PATH}"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN npm install --prefix /opt/pnpm pnpm@10.34.6
ENV PATH="/opt/pnpm/node_modules/.bin:${PATH}"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist/server ./dist/server
COPY db/migrations ./db/migrations
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY server.mjs ./server.mjs
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.mjs"]
