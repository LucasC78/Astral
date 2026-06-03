FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/prisma ./src/prisma
COPY prisma.config.ts ./
RUN npx prisma generate --schema=./src/prisma/schema.prisma

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/src/main.js"]