FROM node:24.21.0-bookworm@sha256:3d27e5c11e5786e309ec3e03f93ae536eb36e6e5eb3714d5eb3300a36157add0 AS node
FROM mcr.microsoft.com/playwright:v1.65.0-noble@sha256:6e3fb709361521eb27161606e6da6d2674e5e89fa16516cb37d6fdd91372273d
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /opt/compass-npm
ENV PATH=/usr/local/bin:$PATH NEXT_TELEMETRY_DISABLED=1
RUN ln -sf /opt/compass-npm/bin/npm-cli.js /usr/local/bin/npm
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tools/visitor-checks/package*.json ./tools/visitor-checks/
RUN npm --prefix tools/visitor-checks ci --no-audit --no-fund
