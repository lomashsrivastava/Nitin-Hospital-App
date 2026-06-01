# ============================================================
# Dockerfile — Frontend (for Docker Compose local dev)
# Production frontend is deployed on Netlify (no Docker needed)
# ============================================================

# STAGE 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Accept build-time API URL (used in Netlify env vars)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend ./
RUN npm run build

# STAGE 2: Serve built files
FROM node:20-alpine
WORKDIR /app

# Install 'serve' globally
RUN npm install -g serve

# Copy built assets from Stage 1
COPY --from=build /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Serve the React app
CMD ["serve", "-s", "dist", "-l", "3000"]
