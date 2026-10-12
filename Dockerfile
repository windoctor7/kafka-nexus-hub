# Stage 1: Build Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for caching
COPY package*.json ./
RUN npm install

# Copy all files and build
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules (sqlite3)
RUN apk add --no-cache python3 make g++ 

# Copy backend files and built frontend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/*repository.js ./
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Create a logs directory
RUN mkdir -p logs

# Environment variables (Defaults - should be overridden in Fargate)
ENV PORT=3001
ENV NODE_ENV=production
ENV SEARCH_PROVIDER=SQLITE

EXPOSE 3001

CMD ["node", "server.js"]
