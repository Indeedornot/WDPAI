# Frontend (Vite dev server)
FROM node:22.12.0-alpine

WORKDIR /app

# Install deps first for better caching
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest (will be overlaid by bind mount in docker-compose for dev)
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
