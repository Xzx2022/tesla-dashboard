# Use the official Node.js image as the base image for building
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install all dependencies including dev dependencies for building
RUN npm ci

# Copy the rest of the application code
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Build the Next.js application
RUN npm run build

# Use a smaller image for the final stage
FROM node:18-alpine AS runner

# Set the working directory
WORKDIR /app

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public directory if it exists
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to the non-root user
USER nextjs

# Expose port 3333
EXPOSE 3333

# Set environment variables (using proper key=value format)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3333

# Start the application on port 3333
CMD ["node", "server.js"]