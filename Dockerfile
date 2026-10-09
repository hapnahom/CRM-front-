# =========================
# Stage 1: Dependencies
# =========================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# =========================
# Stage 2: Builder
# =========================
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache curl jq bash unzip && \
    curl -sSL -o /tmp/vault.zip https://releases.hashicorp.com/vault/1.14.4/vault_1.14.4_linux_amd64.zip && \
    unzip /tmp/vault.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/vault && \
    rm -f /tmp/vault.zip

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG VAULT_ADDR
ARG VAULT_USERNAME
ARG VAULT_PASSWORD
ARG VAULT_SECRET_PATH
ARG VAULT_CACHE_BUSTER

RUN set -e && \
    echo "Fetching secrets from Vault..." && \
    export VAULT_ADDR="${VAULT_ADDR}" && \
    VAULT_TOKEN=$(vault login -method=userpass username="${VAULT_USERNAME}" password="${VAULT_PASSWORD}" -format=json | jq -r .auth.client_token) && \
    export VAULT_TOKEN="$VAULT_TOKEN" && \
    vault kv get -format=json "${VAULT_SECRET_PATH}" \
        | jq -r '.data.data | to_entries[] | "\(.key)=\(.value)"' > .env && \
    echo "✅ Secrets written to .env" && \
    echo "Running lint checks..." && \
    npm run lint || true && \
    echo "Building Next.js app..." && \
    NODE_OPTIONS=--max-old-space-size=4096 npm run build && \
    echo "✅ Build complete"

# =========================
# Stage 3: Runner
# =========================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs -G nodejs

# Copy the full application (source + build + config), owned by nextjs
COPY --from=builder --chown=nextjs:nodejs /app ./

USER nextjs

CMD ["/bin/sh", "-c", "export $(grep -v '^#' /app/.env | xargs) && echo \"Starting Next.js app on port $PORT\" && npx next start -p $PORT"]
