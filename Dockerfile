FROM node:20-slim

WORKDIR /app

# Install system dependencies if any needed
RUN apt-get update && apt-get install -y \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

# Expose ports for Vite (3000) and Server (3001)
EXPOSE 3000 3001

# Command to run both services
# In a real dev env, we might want to split these, 
# but for a single container dev setup, we can use a script or concurrent
CMD ["sh", "-c", "npm run dev & npm run server"]
