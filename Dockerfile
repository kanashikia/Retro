FROM node:20-slim

WORKDIR /app

# Install system dependencies if any needed
RUN apt-get update && apt-get install -y \
    procps curl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "server/index.js"]
