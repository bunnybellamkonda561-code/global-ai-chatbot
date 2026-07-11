# Use official lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package config files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source files
COPY . .

# Expose port 3000
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Command to run application
CMD ["node", "server.js"]
