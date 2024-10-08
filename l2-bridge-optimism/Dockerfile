# Build stage: compile Typescript to Javascript
FROM node:20.15.0-alpine3.20 AS base

RUN apk add --no-cache g++=13.2.1_git20240309-r0 make=4.4.1-r2

FROM base as builder

WORKDIR /app

COPY . .
RUN yarn install --immutable && yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM base as production
LABEL "network.forta.settings.agent-logs.enable"="true"

ENV APP_NAME=l2-bridge-optimism
ENV NODE_ENV=production
ENV ETHEREUM_RPC_URL=https://eth.drpc.org
ENV OPTIMISM_RPC_URL=https://optimism.drpc.org

ENV AGENT_GRPC_PORT=50051
ENV HTTP_PORT=3000
ENV LOG_FORMAT=simple
ENV LOG_LEVEL=info
ENV INSTANCE=forta
ENV USE_FORTA_RPC_URL=true

WORKDIR /app

COPY package*.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src
COPY version.json ./

CMD ["yarn", "run", "start:docker:prod"]