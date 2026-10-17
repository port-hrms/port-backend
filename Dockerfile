FROM node:25 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production


COPY . .



FROM node:25

WORKDIR /app
ENV NODE_ENV=production


COPY --from=builder /app ./

EXPOSE 7000
CMD ["node", "index.js"]