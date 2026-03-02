FROM oven/bun:1

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["bun", "run", "src/api.ts"]
