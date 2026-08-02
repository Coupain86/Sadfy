# Image du serveur Sadfy.
#
# Multi-étapes : on compile avec les outils de développement, on n'expédie que le
# résultat. L'image finale ne contient ni TypeScript, ni tests, ni sources.

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/app/package.json packages/app/

# --ignore-scripts : aucun paquet n'a besoin d'exécuter du code à l'installation, et
# c'est une porte d'entrée classique pour une dépendance compromise.
RUN npm ci --ignore-scripts --workspace @sadfy/shared --workspace @sadfy/server

COPY packages/shared packages/shared
COPY packages/server packages/server

RUN npm run build --workspace @sadfy/shared \
 && npm run build --workspace @sadfy/server

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/packages/server/dist packages/server/dist
COPY --from=build /app/packages/server/package.json packages/server/

# Jamais root : si le processus est compromis, il ne doit pas posséder la machine.
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/sante').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "packages/server/dist/index.js"]
