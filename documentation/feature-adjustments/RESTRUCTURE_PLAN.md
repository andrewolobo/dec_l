# DEC_L Directory Restructure Plan

## Overview

Transform current single-app structure into a monorepo that separates API and UI layers while maintaining independent deployment capabilities.

---

## Current Structure

```
DEC_L/
├── .env
├── .gitignore
├── package.json                    # API dependencies
├── tsconfig.json                   # API TypeScript config
├── jest.config.js                  # API tests
├── prisma.config.ts
├── README.md
├── node_modules/                   # API node_modules
├── dist/                           # API build output
├── src/                            # API source code
│   ├── app.ts
│   ├── server.ts
│   ├── __tests__/
│   ├── config/
│   ├── controllers/
│   ├── dal/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── validation/
├── prisma/                         # Database schema
├── api-tests/                      # HTTP test files
├── documentation/                  # Project docs
├── specification/                  # Requirements
└── coverage/                       # Test coverage
```

---

## Target Structure

```
DEC_L/
├── .gitignore                      # Root gitignore
├── package.json                    # Root workspace config
├── README.md                       # Root readme
├── turbo.json                      # Optional: Turborepo config
├── .env.example                    # Example environment variables
│
├── apps/
│   ├── api/                        # Backend application
│   │   ├── .env                    # API environment variables
│   │   ├── .gitignore              # API-specific ignores
│   │   ├── package.json            # API dependencies
│   │   ├── tsconfig.json           # API TypeScript config
│   │   ├── jest.config.js          # API tests config
│   │   ├── prisma.config.ts
│   │   ├── README.md               # API documentation
│   │   ├── Dockerfile              # API containerization
│   │   ├── .dockerignore
│   │   ├── node_modules/           # API dependencies
│   │   ├── dist/                   # API build output
│   │   ├── coverage/               # API test coverage
│   │   ├── src/                    # API source code
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── __tests__/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── dal/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── validation/
│   │   ├── prisma/                 # Database schema
│   │   └── api-tests/              # HTTP test files
│   │
│   └── web/                        # Frontend application (TO BE CREATED)
│       ├── .env
│       ├── .gitignore
│       ├── package.json
│       ├── svelte.config.js
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── Dockerfile
│       ├── .dockerignore
│       ├── README.md
│       ├── node_modules/
│       ├── build/
│       ├── src/
│       │   ├── routes/
│       │   ├── lib/
│       │   ├── app.html
│       │   └── app.css
│       ├── static/
│       └── tests/
│
├── packages/                       # Shared code (OPTIONAL)
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── types/              # Shared TypeScript types
│       │   │   ├── user.types.ts
│       │   │   ├── post.types.ts
│       │   │   ├── category.types.ts
│       │   │   ├── payment.types.ts
│       │   │   └── api.types.ts
│       │   └── constants/          # Shared constants
│       │       ├── pricing.ts
│       │       └── validation.ts
│       └── README.md
│
├── docker/                         # Docker orchestration
│   ├── docker-compose.yml          # Development setup
│   ├── docker-compose.prod.yml     # Production setup
│   └── nginx.conf                  # Reverse proxy
│
├── documentation/                  # Project documentation (MOVE)
├── specification/                  # Project specifications (MOVE)
│
└── .github/                        # CI/CD workflows
    └── workflows/
        ├── api-ci.yml
        └── web-ci.yml
```

---

## Migration Steps

### Phase 1: Backup & Preparation

```powershell
# 1. Create backup
git add .
git commit -m "Pre-restructure checkpoint"
git tag pre-restructure-backup

# 2. Ensure clean working directory
git status

# 3. Create restructure branch
git checkout -b restructure/monorepo
```

### Phase 2: Create New Directory Structure

```powershell
# Create main directories
New-Item -ItemType Directory -Path "apps/api" -Force
New-Item -ItemType Directory -Path "apps/web" -Force
New-Item -ItemType Directory -Path "packages/shared/src" -Force
New-Item -ItemType Directory -Path "docker" -Force
```

### Phase 3: Move API Files

```powershell
# Move source code
Move-Item -Path "src" -Destination "apps/api/src"

# Move configuration files
Move-Item -Path "package.json" -Destination "apps/api/package.json"
Move-Item -Path "package-lock.json" -Destination "apps/api/package-lock.json"
Move-Item -Path "tsconfig.json" -Destination "apps/api/tsconfig.json"
Move-Item -Path "jest.config.js" -Destination "apps/api/jest.config.js"
Move-Item -Path "prisma.config.ts" -Destination "apps/api/prisma.config.ts"

# Move database files
Move-Item -Path "prisma" -Destination "apps/api/prisma"

# Move test and documentation files
Move-Item -Path "api-tests" -Destination "apps/api/api-tests"
Move-Item -Path "coverage" -Destination "apps/api/coverage"

# Move environment files
Move-Item -Path ".env" -Destination "apps/api/.env"

# Move build artifacts
Move-Item -Path "dist" -Destination "apps/api/dist"
Move-Item -Path "node_modules" -Destination "apps/api/node_modules"
```

### Phase 4: Create Root Configuration Files

**Root package.json** (Create new)

```json
{
  "name": "dec_l",
  "version": "1.0.0",
  "private": true,
  "description": "Digital Exchange Classifieds - Monorepo",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:api": "npm run dev --workspace=apps/api",
    "dev:web": "npm run dev --workspace=apps/web",
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "build:api": "npm run build --workspace=apps/api",
    "build:web": "npm run build --workspace=apps/web",
    "build": "npm run build:api && npm run build:web",
    "test:api": "npm run test --workspace=apps/api",
    "test:web": "npm run test --workspace=apps/web",
    "test": "npm run test:api && npm run test:web",
    "docker:dev": "docker-compose -f docker/docker-compose.yml up",
    "docker:dev:build": "docker-compose -f docker/docker-compose.yml up --build",
    "docker:prod": "docker-compose -f docker/docker-compose.prod.yml up -d",
    "docker:down": "docker-compose -f docker/docker-compose.yml down",
    "clean": "npm run clean --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### Phase 5: Update API Configuration

**apps/api/package.json** (Update scripts)

```json
{
  "name": "@dec_l/api",
  "version": "1.0.0",
  "description": "DEC_L Backend API",
  "main": "dist/server.js",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration --runInBand",
    "build": "tsc",
    "dev": "ts-node src/server.ts",
    "dev:watch": "nodemon --watch src --exec ts-node src/server.ts",
    "start": "node dist/server.js",
    "clean": "rm -rf dist coverage node_modules",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

**apps/api/tsconfig.json** (No changes needed - paths remain relative)

**apps/api/.gitignore** (Create)

```
node_modules/
dist/
coverage/
.env
.env.local
*.log
.DS_Store
```

### Phase 6: Create Shared Package (Optional)

**packages/shared/package.json**

```json
{
  "name": "@dec_l/shared",
  "version": "1.0.0",
  "description": "Shared types and utilities for DEC_L",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./constants": "./src/constants/index.ts"
  },
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

**packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**packages/shared/src/index.ts**

```typescript
// Export all shared types
export * from "./types";
export * from "./constants";
```

### Phase 7: Update Root Files

**Root .gitignore** (Update)

```
# Dependencies
node_modules/
package-lock.json

# Environment
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
coverage/
.svelte-kit/

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temp
*.tmp
.cache/
```

**Root README.md** (Update)

```markdown
# DEC_L - Digital Exchange Classifieds

A modern classifieds platform with separate API and web applications.

## Project Structure

- `apps/api` - Backend REST API (Express + TypeScript + Prisma)
- `apps/web` - Frontend application (SvelteKit + TypeScript)
- `packages/shared` - Shared types and utilities
- `docker/` - Docker configuration for containerization

## Quick Start

### Development

\`\`\`bash

# Install all dependencies

npm install

# Run API only

npm run dev:api

# Run Web only

npm run dev:web

# Run both (requires both apps set up)

npm run dev
\`\`\`

### Testing

\`\`\`bash

# Test API

npm run test:api

# Test with coverage

npm run test:coverage --workspace=apps/api
\`\`\`

### Docker

\`\`\`bash

# Development

npm run docker:dev

# Production

npm run docker:prod
\`\`\`

## Documentation

See `/documentation` for detailed implementation guides.
```

### Phase 8: Post-Migration Verification

```powershell
# 1. Verify API structure
cd apps/api
npm install
npm run build
npm run test

# 2. Verify workspace setup
cd ../..
npm install

# 3. Test workspace commands
npm run dev:api
npm run build:api
npm run test:api

# 4. Commit changes
git add .
git commit -m "Restructure: Convert to monorepo with separate API and Web apps"
```

---

## Files Requiring Updates

### ✅ No Path Updates Needed

All imports in the API use **relative paths** (`../`, `../../`, `./`), which will continue to work after the move since the internal structure of `apps/api/src/` remains unchanged.

### ✅ Configuration Files Updates

These files have absolute or root-relative paths that need updating:

1. **apps/api/tsconfig.json**
   - ✅ NO CHANGES - Uses relative paths (`./src`, `./dist`)

2. **apps/api/jest.config.js**
   - ✅ NO CHANGES - Uses relative paths

3. **apps/api/prisma.config.ts**
   - ✅ NO CHANGES - Uses relative paths

4. **GitHub Actions** (if exists)
   - Update working directories to `apps/api`
   - Update artifact paths

5. **Documentation files**
   - Update any file paths mentioned in markdown files
   - Update command examples to use workspace syntax

### 📝 Environment Variables

**apps/api/.env** - No changes needed, but document that it's now in apps/api/

### 📝 Scripts & Commands

All npm scripts work with relative paths, no changes needed.

---

## Rollback Plan

If something goes wrong:

```powershell
# Option 1: Revert to backup tag
git reset --hard pre-restructure-backup

# Option 2: Revert last commit
git revert HEAD

# Option 3: Delete branch and start over
git checkout main
git branch -D restructure/monorepo
```

---

## Benefits of This Structure

### 1. **Separation of Concerns**

- API and Web are independent applications
- Each can be deployed separately
- Different dependency trees

### 2. **Scalability**

- Easy to add more apps (mobile API, admin dashboard)
- Shared code reduces duplication
- Clear boundaries between layers

### 3. **Independent Deployment**

- Build and deploy API without touching Web
- Different deployment schedules
- Separate CI/CD pipelines

### 4. **Docker Ready**

- Each app has its own Dockerfile
- Can run API without Web (and vice versa)
- Better container optimization

### 5. **Team Collaboration**

- Frontend and backend teams work independently
- Clearer code ownership
- Reduced merge conflicts

---

## Next Steps After Restructure

1. ✅ Verify API functionality
2. 🔄 Initialize Svelte app in `apps/web/`
3. 🔄 Create shared types in `packages/shared/`
4. 🔄 Create Docker configurations
5. 🔄 Update CI/CD pipelines
6. 🔄 Update documentation

---

## Estimated Time: 1-2 hours

- Backup & setup: 10 minutes
- File migration: 15 minutes
- Configuration updates: 20 minutes
- Testing & verification: 30 minutes
- Documentation: 15 minutes
- Buffer: 30 minutes
