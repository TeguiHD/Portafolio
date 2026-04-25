FROM node:24-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build \
	&& mkdir -p .next/standalone/.next \
	&& cp -R .next/static .next/standalone/.next/static \
	&& cp -R public .next/standalone/public

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]
