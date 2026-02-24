FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000
CMD ["npm", "run", "start:railway"]
