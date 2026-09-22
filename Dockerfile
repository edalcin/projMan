# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 v13 traz os binarios (inclusive linuxmusl) no pacote; sem
# --ignore-scripts o npm tentaria o node-gyp implicito e exigiria toolchain.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/projman.db \
    FILES_PATH=/files
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# UNRAID: nobody:users. npm global sai: runtime nao usa, e e a fonte dos CVEs da base.
RUN mkdir -p /data /files && chown 99:100 /data /files \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER 99:100
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/saude').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "build"]
