FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/file-master run build
RUN pnpm --filter @workspace/api-server run build

EXPOSE 10000

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
