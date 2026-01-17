# Development stage
FROM oven/bun:1 AS development

WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM oven/bun:1 AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json bun.lock* ./
RUN bun install

COPY . .
RUN bun run build

# Production stage
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
