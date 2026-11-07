FROM node:24.21.0-bookworm@sha256:3d27e5c11e5786e309ec3e03f93ae536eb36e6e5eb3714d5eb3300a36157add0 AS node
# 1.65.0 Firefox crashes when role locators and axe both read ARIA references.
# Keep the matching stable runner/browser pair until upstream #43967 is fixed.
FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /opt/compass-npm
ENV PATH=/usr/local/bin:$PATH NEXT_TELEMETRY_DISABLED=1
RUN ln -sf /opt/compass-npm/bin/npm-cli.js /usr/local/bin/npm
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tools/visitor-checks/package*.json ./tools/visitor-checks/
RUN npm --prefix tools/visitor-checks ci --no-audit --no-fund

COPY tools/knowledge-checks/package*.json ./tools/knowledge-checks/
RUN npm --prefix tools/knowledge-checks ci --ignore-scripts --no-audit --no-fund
