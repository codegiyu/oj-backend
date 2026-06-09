FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --legacy-peer-deps

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
  TZ=Africa/Lagos

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --legacy-peer-deps

COPY --from=build /app/dist ./dist

EXPOSE 4400

# Default: API process. Override CMD to ["npm", "run", "start:worker"] for worker service.
CMD ["npm", "start"]
