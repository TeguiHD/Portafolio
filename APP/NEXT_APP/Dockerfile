FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["pnpm", "run", "start"]

