# ===========================================
# Frontend image - multi-stage build
# ===========================================
# Stage 1 (builder):    install ALL dependencies and compile React into
#                       static files (build/)
# Stage 2 (production): a clean image with only build/ and the "serve" web
#                       server - no source code and none of the ~1,400
#                       packages that were only needed to compile it
#
# Build & run on its own:
#   docker build --build-arg REACT_APP_API_URL=http://localhost:8080 -t bug-tracker-frontend ./frontend
#   docker run -p 3000:3000 bug-tracker-frontend
# ===========================================

# ── Stage 1: build the React app into static files ───────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# REACT_APP_* values are baked into the JavaScript bundle at BUILD time
# (npm run build), so the backend URL must be a build ARG - setting an ENV
# when the container starts would be too late.
ARG REACT_APP_API_URL=http://localhost:8080
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# ── Stage 2: serve the static files ──────────────────────────────────────────
FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN npm install -g serve@14 && npm cache clean --force
COPY --from=builder /app/build ./build
USER node
EXPOSE 3000
# -s = single-page-app mode (unknown paths fall back to index.html)
CMD ["serve", "-s", "build", "-l", "3000"]
