FROM node:20-slim

WORKDIR /app

# Prisma on Debian images needs OpenSSL runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

# Keep devDependencies because runtime uses tsx in `npm run start`.
RUN npm ci
RUN npx prisma generate

COPY . .

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Railway sets PORT automatically; DB schema is managed outside container startup.
CMD ["npm", "run", "start"]
