FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM node:22-alpine AS runtime

# Install Chromium for Puppeteer (Alpine package)
RUN apk add --no-cache chromium

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
RUN corepack enable && pnpm install --prod

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3010
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3010

CMD ["node", "dist/server.js"]

