# DEC_L Containerization Guide

This guide shows how to containerize the API and Web applications in your new monorepo structure.

## Quick Reference

```bash
# Build and run everything
docker-compose -f docker/docker-compose.yml up --build

# Run API only
docker-compose -f docker/docker-compose.yml up api

# Run in production
docker-compose -f docker/docker-compose.prod.yml up -d
```

---

## API Dockerfile

Create: `apps/api/Dockerfile`

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

USER apiuser

EXPOSE 3000

CMD ["npm", "start"]
```

Create: `apps/api/.dockerignore`

```
node_modules
npm-debug.log
.env
.env.local
dist
coverage
*.test.ts
*.spec.ts
__tests__
.git
.gitignore
documentation
api-tests
```

---

## Web Dockerfile (for future Svelte app)

Create: `apps/web/Dockerfile`

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production image with Node adapter
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 svelteuser

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

USER svelteuser

EXPOSE 3000

CMD ["node", "build"]
```

Create: `apps/web/.dockerignore`

```
node_modules
npm-debug.log
.env
.env.local
.svelte-kit
build
.DS_Store
tests
.git
.gitignore
```

---

## Docker Compose - Development

Create: `docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: dec_l_sqlserver
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Password123
      - MSSQL_PID=Developer
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql
    networks:
      - dec_l_network
    healthcheck:
      test: /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Password123 -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 3s
      retries: 10
      start_period: 10s

  api:
    build:
      context: ../apps/api
      dockerfile: Dockerfile
    container_name: dec_l_api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=sqlserver://sqlserver:1433;database=DEC_L_DB;user=sa;password=YourStrong@Password123;encrypt=true;trustServerCertificate=true
      - JWT_SECRET=${JWT_SECRET:-your-dev-jwt-secret}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-your-dev-refresh-secret}
      - PORT=3000
    depends_on:
      sqlserver:
        condition: service_healthy
    volumes:
      - ../apps/api/src:/app/src
      - /app/node_modules
    networks:
      - dec_l_network
    command: npm run dev

  web:
    build:
      context: ../apps/web
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=http://localhost:3000/api/v1
    container_name: dec_l_web
    ports:
      - "5173:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - api
    volumes:
      - ../apps/web/src:/app/src
      - /app/node_modules
      - /app/.svelte-kit
    networks:
      - dec_l_network
    command: npm run dev -- --host

  nginx:
    image: nginx:alpine
    container_name: dec_l_nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web
    networks:
      - dec_l_network

volumes:
  sqlserver_data:

networks:
  dec_l_network:
    driver: bridge
```

---

## Docker Compose - Production

Create: `docker/docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  api:
    build:
      context: ../apps/api
      dockerfile: Dockerfile
      target: runner
    container_name: dec_l_api_prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - PORT=3000
    restart: unless-stopped
    networks:
      - dec_l_network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  web:
    build:
      context: ../apps/web
      dockerfile: Dockerfile
      target: runner
      args:
        - VITE_API_URL=${API_URL}
    container_name: dec_l_web_prod
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dec_l_network

  nginx:
    image: nginx:alpine
    container_name: dec_l_nginx_prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web
    restart: unless-stopped
    networks:
      - dec_l_network

networks:
  dec_l_network:
    driver: bridge
```

---

## Nginx Configuration

Create: `docker/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api_backend {
        server api:3000;
    }

    upstream web_frontend {
        server web:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web_limit:10m rate=50r/s;

    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API requests
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Frontend requests
        location / {
            limit_req zone=web_limit burst=100 nodelay;
            
            proxy_pass http://web_frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://api_backend/health;
        }
    }
}
```

---

## Environment Variables

Create: `docker/.env.example`

```env
# Database (Production - use Azure SQL or external SQL Server)
DATABASE_URL=sqlserver://your-server.database.windows.net:1433;database=DEC_L_DB;user=admin;password=YourPassword;encrypt=true

# JWT Secrets (Generate strong secrets for production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# API URL (for frontend)
API_URL=https://your-domain.com/api/v1

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

---

## Deployment Commands

### Development

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up

# Start with build
docker-compose -f docker/docker-compose.yml up --build

# Start specific service
docker-compose -f docker/docker-compose.yml up api

# View logs
docker-compose -f docker/docker-compose.yml logs -f api

# Stop all services
docker-compose -f docker/docker-compose.yml down

# Stop and remove volumes
docker-compose -f docker/docker-compose.yml down -v
```

### Production

```bash
# Set environment variables
cp docker/.env.example docker/.env
# Edit docker/.env with production values

# Start in detached mode
docker-compose -f docker/docker-compose.prod.yml up -d

# View logs
docker-compose -f docker/docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.prod.yml down

# Update and restart
docker-compose -f docker/docker-compose.prod.yml up -d --build
```

---

## Testing Containers

### Test API Container

```bash
# Build and run API only
cd apps/api
docker build -t dec_l_api .
docker run -p 3000:3000 --env-file .env dec_l_api

# Test API
curl http://localhost:3000/health
```

### Test Web Container

```bash
# Build and run Web only
cd apps/web
docker build -t dec_l_web --build-arg VITE_API_URL=http://localhost:3000/api/v1 .
docker run -p 5173:3000 dec_l_web

# Open browser
open http://localhost:5173
```

---

## Azure Container Instances Deployment

### Build and Push Images

```bash
# Login to Azure Container Registry
az acr login --name yourregistry

# Build and push API
cd apps/api
docker build -t yourregistry.azurecr.io/dec_l_api:latest .
docker push yourregistry.azurecr.io/dec_l_api:latest

# Build and push Web
cd apps/web
docker build -t yourregistry.azurecr.io/dec_l_web:latest .
docker push yourregistry.azurecr.io/dec_l_web:latest
```

### Deploy to ACI

```bash
# Create resource group
az group create --name dec-l-rg --location eastus

# Deploy API container
az container create \
  --resource-group dec-l-rg \
  --name dec-l-api \
  --image yourregistry.azurecr.io/dec_l_api:latest \
  --cpu 1 --memory 1 \
  --registry-login-server yourregistry.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label dec-l-api \
  --ports 3000 \
  --environment-variables \
    DATABASE_URL=$DATABASE_URL \
    JWT_SECRET=$JWT_SECRET

# Deploy Web container
az container create \
  --resource-group dec-l-rg \
  --name dec-l-web \
  --image yourregistry.azurecr.io/dec_l_web:latest \
  --cpu 1 --memory 1 \
  --registry-login-server yourregistry.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --dns-name-label dec-l-web \
  --ports 3000
```

---

## Health Checks

Add to `apps/api/src/app.ts`:

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

---

## Container Size Optimization

### Multi-stage Builds
- ✅ Already using multi-stage builds in Dockerfiles
- Separates build dependencies from runtime
- Reduces final image size by 60-70%

### .dockerignore
- ✅ Excludes unnecessary files
- Speeds up build process
- Reduces context size

### Alpine Base
- ✅ Using node:20-alpine
- Smallest Node.js image (~40MB vs ~300MB)

---

## Monitoring & Logging

### View Container Logs

```bash
# All containers
docker-compose -f docker/docker-compose.yml logs -f

# Specific container
docker-compose -f docker/docker-compose.yml logs -f api

# Last 100 lines
docker-compose -f docker/docker-compose.yml logs --tail=100 api
```

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats dec_l_api
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs dec_l_api

# Inspect container
docker inspect dec_l_api

# Check if port is in use
netstat -an | grep 3000
```

### Database connection issues

```bash
# Test SQL Server connection
docker exec -it dec_l_sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P YourStrong@Password123 -Q "SELECT 1"

# Check API environment variables
docker exec dec_l_api printenv | grep DATABASE
```

### Rebuild from scratch

```bash
# Stop and remove everything
docker-compose -f docker/docker-compose.yml down -v

# Remove images
docker rmi $(docker images 'dec_l_*' -q)

# Rebuild
docker-compose -f docker/docker-compose.yml up --build
```

---

## Next Steps

1. ✅ Create Dockerfiles for API
2. ⏳ Initialize Svelte app in `apps/web`
3. ⏳ Create Dockerfile for Web
4. ⏳ Set up docker-compose files
5. ⏳ Configure Nginx
6. ⏳ Test locally
7. ⏳ Deploy to production

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Azure Container Instances](https://azure.microsoft.com/en-us/services/container-instances/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
