FROM node:24.13-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts && npm cache clean --force

FROM node:24.13-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY package.json package-lock.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
EXPOSE 8080
CMD ["node", "dist/remote.js"]
