FROM node:18-slim
RUN apt-get update && apt-get install -y ca-certificates python3 make g++ libc6-dev libvips-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
