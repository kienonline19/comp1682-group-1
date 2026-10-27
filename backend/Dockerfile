# ===========================================
# Backend image - multi-stage build
# ===========================================
# Stage 1 (deps):       install ONLY the production dependencies
# Stage 2 (production): copy them + the source into a clean image
#
# Only the last stage ends up in the final image, so npm's download cache
# and anything else left behind in stage 1 is thrown away.
#
# Build & run on its own:
#   docker build -t bug-tracker-backend ./backend
#   docker run -p 8080:8080 -e DB_HOST=... bug-tracker-backend
# ===========================================

# ── Stage 1: install production dependencies ─────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app
# Copy only the package files first: this layer (and the slow npm ci below)
# is reused from cache until package.json / package-lock.json change.
COPY package.json package-lock.json ./
# npm ci installs the exact versions from the lock file.
# --omit=dev skips jest, supertest and nodemon - they are only needed for testing.
RUN npm ci --omit=dev

# ── Stage 2: lean runtime image ──────────────────────────────────────────────
FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Do not run as root: the official Node image ships a non-root user "node".
USER node
EXPOSE 8080
CMD ["node", "server.js"]
