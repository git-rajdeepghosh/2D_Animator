# Next.js 14 (App Router) production image.
#
# IMPORTANT: Next inlines NEXT_PUBLIC_* variables into the client bundle at
# BUILD time, not at run time. A value supplied only via docker-compose's
# `environment:` block arrives too late and the browser bundle keeps whatever
# was baked in here. That is why they are ARGs consumed before `npm run build`.
# To point the browser at a non-default API host, pass a build arg:
#   docker compose build --build-arg NEXT_PUBLIC_API_URL=http://host:8000 frontend
FROM node:20-alpine

WORKDIR /app

# Install deps first so this layer caches across source-only changes.
# `npm ci` (not `install`) for reproducible builds from package-lock.json.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Baked into the client bundle at build time — see the note above.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
