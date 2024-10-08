# Build stage: compile Typescript to Javascript
FROM node:20.10.0-alpine3.18 AS base

RUN apk add --no-cache python3=3.11.8-r0 g++=12.2.1_git20220924-r10 make=4.4.1-r1

FROM base AS builder

WORKDIR /app

COPY . .
RUN yarn install --immutable && yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM base AS production
LABEL "network.forta.settings.agent-logs.enable"="true"

ENV APP_NAME=csm-alerts
ENV NODE_ENV=production
ENV ETHEREUM_RPC_URL=https://holesky.drpc.org

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