FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server/ ./server/
COPY client/ ./client/

WORKDIR /app/client
RUN npm install && npm run build

WORKDIR /app
EXPOSE 3178

CMD ["node", "server/index.js"]
