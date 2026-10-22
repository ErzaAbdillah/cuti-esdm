# Image produksi: build Next.js (output standalone) + target terpisah untuk migrasi/seed master.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Hanya agar prisma.config.ts terbaca saat generate; URL asli diberikan saat runtime (env_file).
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Menjalankan `prisma migrate deploy` (dan seed master bila diminta) sebelum app start.
FROM build AS migrator
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 TZ=Asia/Makassar STORAGE_DIR=/data/berkas
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app \
  && mkdir -p /data/berkas && chown -R app:app /data
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/sehat').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
