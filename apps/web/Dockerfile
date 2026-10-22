# Production image (Railway builds this file from the apps/web root directory).
# Local development uses Dockerfile.dev through docker-compose.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The API is served by Caddy under /api on the same origin (see Caddyfile).
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM caddy:2.8-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
ENV PORT=8080
EXPOSE 8080
