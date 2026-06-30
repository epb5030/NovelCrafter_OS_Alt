# Build frontend static files
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Build backend code
FROM node:20-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend ./
RUN npm run build

# Final run image
FROM node:20-slim
WORKDIR /app

# Create directory for persistent SQLite database
RUN mkdir -p /app/data

# Copy backend dependencies and compiled build
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/package.json

# Copy frontend static build assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 3000
ENV PORT=3000
ENV DATABASE_DIR=/app/data
ENV NODE_ENV=production

CMD ["node", "backend/dist/index.js"]
