FROM node:24.21.0-bookworm@sha256:3d27e5c11e5786e309ec3e03f93ae536eb36e6e5eb3714d5eb3300a36157add0
WORKDIR /tool
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY resource-probe.mjs ./
ENV SEMANTIC_WORK=/experiment SEMANTIC_PACKAGE=/tool/node_modules/@huggingface/transformers/dist/transformers.node.mjs
CMD ["node", "resource-probe.mjs"]
