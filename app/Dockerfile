# syntax=docker/dockerfile:1
#
# Frontend image: build the Vite/React app, then serve the static bundle with
# nginx. Build context is ./app (see docker-compose.yml).

# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# The browser (not the container) opens the WebSocket, so this must point at the
# backend port as reachable from the host. Vite inlines VITE_* at build time;
# override via the compose build arg if you serve on another host/port.
ARG VITE_SIM_WS_URL=ws://localhost:8000/ws
ENV VITE_SIM_WS_URL=$VITE_SIM_WS_URL

# Install deps first for layer caching (needs devDeps for tsc + vite build).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Serve stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
