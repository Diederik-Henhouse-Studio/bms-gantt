# ── Stage 1: base with lib built ──────────────────────────────
FROM node:22-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# ── Stage 2: test app server ─────────────────────────────────
FROM base AS app
WORKDIR /app/testing/app
COPY testing/app/package.json ./
RUN npm install --ignore-scripts
COPY testing/app/ ./
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
EXPOSE 5199
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5199"]

# ── Stage 3: Playwright runner ───────────────────────────────
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS playwright
WORKDIR /app
COPY --from=base /app /app
WORKDIR /app/testing
COPY testing/package.json ./
RUN npm install --ignore-scripts
COPY testing/tests/ ./tests/
COPY testing/playwright.config.ts ./
CMD ["npx", "playwright", "test", "--reporter=list"]

# ── Stage 4: Crawl4AI analysis ───────────────────────────────
FROM python:3.12-slim AS crawl4ai
WORKDIR /app
RUN pip install --no-cache-dir crawl4ai playwright && \
    python -m playwright install chromium && \
    python -m playwright install-deps chromium
COPY testing/crawl4ai/ ./crawl4ai/
COPY docs/features/ ./docs/features/
CMD ["python", "crawl4ai/validate.py"]
