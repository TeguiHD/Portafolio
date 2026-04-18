FROM node:23-alpine

WORKDIR /app

COPY package*.json ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install

COPY . .

RUN npm run build \
	&& mkdir -p .next/standalone/.next \
	&& cp -R .next/static .next/standalone/.next/static \
	&& cp -R public .next/standalone/public

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]

