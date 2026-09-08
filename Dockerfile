FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "start"]
