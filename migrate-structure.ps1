# DEC_L Directory Restructure Migration Script
# Execute this script from the project root: .\migrate-structure.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "DEC_L Monorepo Restructure" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
  Write-Host "ERROR: Run this script from the DEC_L project root!" -ForegroundColor Red
  exit 1
}

# Confirm before proceeding
Write-Host "This script will restructure your project into a monorepo." -ForegroundColor Yellow
Write-Host "Current directory: $PWD" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Create backup and proceed? (yes/no)"
if ($confirm -ne "yes") {
  Write-Host "Aborted." -ForegroundColor Red
  exit 0
}

Write-Host ""
Write-Host "Step 1: Creating backup..." -ForegroundColor Green
git add .
git commit -m "Pre-restructure checkpoint - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ErrorAction SilentlyContinue
git tag pre-restructure-backup -ErrorAction SilentlyContinue

Write-Host "Step 2: Creating branch..." -ForegroundColor Green
git checkout -b restructure/monorepo -ErrorAction SilentlyContinue

Write-Host "Step 3: Creating directory structure..." -ForegroundColor Green
New-Item -ItemType Directory -Path "apps/api" -Force | Out-Null
New-Item -ItemType Directory -Path "apps/web" -Force | Out-Null
New-Item -ItemType Directory -Path "packages/shared/src/types" -Force | Out-Null
New-Item -ItemType Directory -Path "packages/shared/src/constants" -Force | Out-Null
New-Item -ItemType Directory -Path "docker" -Force | Out-Null

Write-Host "Step 4: Moving API files..." -ForegroundColor Green

# Move source code
if (Test-Path "src") {
  Move-Item -Path "src" -Destination "apps/api/src" -Force
  Write-Host "  ✓ Moved src/" -ForegroundColor Gray
}

# Move configuration files
$configFiles = @(
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "jest.config.js",
  "prisma.config.ts"
)

foreach ($file in $configFiles) {
  if (Test-Path $file) {
    Move-Item -Path $file -Destination "apps/api/$file" -Force
    Write-Host "  ✓ Moved $file" -ForegroundColor Gray
  }
}

# Move database files
if (Test-Path "prisma") {
  Move-Item -Path "prisma" -Destination "apps/api/prisma" -Force
  Write-Host "  ✓ Moved prisma/" -ForegroundColor Gray
}

# Move test and build files
$buildFiles = @(
  @{src = "api-tests"; dest = "apps/api/api-tests" },
  @{src = "coverage"; dest = "apps/api/coverage" },
  @{src = "dist"; dest = "apps/api/dist" },
  @{src = "node_modules"; dest = "apps/api/node_modules" }
)

foreach ($item in $buildFiles) {
  if (Test-Path $item.src) {
    Move-Item -Path $item.src -Destination $item.dest -Force
    Write-Host "  ✓ Moved $($item.src)" -ForegroundColor Gray
  }
}

# Move environment file
if (Test-Path ".env") {
  Copy-Item -Path ".env" -Destination "apps/api/.env" -Force
  Write-Host "  ✓ Copied .env to apps/api/" -ForegroundColor Gray
}

Write-Host "Step 5: Creating root configuration files..." -ForegroundColor Green

# Create root package.json
$rootPackageJson = @'
{
  "name": "dec_l",
  "version": "1.0.0",
  "private": true,
  "description": "Digital Exchange Classifieds - Monorepo",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
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
'@
Set-Content -Path "package.json" -Value $rootPackageJson
Write-Host "  ✓ Created root package.json" -ForegroundColor Gray

# Update API package.json
$apiPackageJson = Get-Content "apps/api/package.json" -Raw | ConvertFrom-Json
$apiPackageJson.name = "@dec_l/api"
$apiPackageJson.description = "DEC_L Backend API"
$apiPackageJson.scripts | Add-Member -NotePropertyName "clean" -NotePropertyValue "rm -rf dist coverage node_modules" -Force
$apiPackageJson.scripts | Add-Member -NotePropertyName "prisma:generate" -NotePropertyValue "prisma generate" -Force
$apiPackageJson.scripts | Add-Member -NotePropertyName "prisma:migrate" -NotePropertyValue "prisma migrate dev" -Force
$apiPackageJson.scripts | Add-Member -NotePropertyName "prisma:studio" -NotePropertyValue "prisma studio" -Force
$apiPackageJson | ConvertTo-Json -Depth 10 | Set-Content "apps/api/package.json"
Write-Host "  ✓ Updated apps/api/package.json" -ForegroundColor Gray

# Create API .gitignore
$apiGitignore = @'
node_modules/
dist/
coverage/
.env
.env.local
*.log
.DS_Store
'@
Set-Content -Path "apps/api/.gitignore" -Value $apiGitignore
Write-Host "  ✓ Created apps/api/.gitignore" -ForegroundColor Gray

# Create API README
$apiReadme = @'
# DEC_L API

Backend REST API for the DEC_L classifieds platform.

## Tech Stack
- Node.js + Express 5.2.1
- TypeScript
- Prisma ORM + SQL Server
- JWT Authentication
- Jest for testing

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## API Documentation
See `/api-tests` folder for HTTP request examples.

## Environment Variables
Copy `.env.example` to `.env` and configure:
- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- OAuth credentials (optional)
'@
Set-Content -Path "apps/api/README.md" -Value $apiReadme
Write-Host "  ✓ Created apps/api/README.md" -ForegroundColor Gray

# Create shared package files
Write-Host "Step 6: Creating shared package..." -ForegroundColor Green

$sharedPackageJson = @'
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
'@
Set-Content -Path "packages/shared/package.json" -Value $sharedPackageJson
Write-Host "  ✓ Created packages/shared/package.json" -ForegroundColor Gray

$sharedTsConfig = @'
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
'@
Set-Content -Path "packages/shared/tsconfig.json" -Value $sharedTsConfig
Write-Host "  ✓ Created packages/shared/tsconfig.json" -ForegroundColor Gray

$sharedIndex = @'
// Export all shared types and constants
export * from './types';
export * from './constants';
'@
Set-Content -Path "packages/shared/src/index.ts" -Value $sharedIndex

$sharedTypesIndex = @'
// Shared TypeScript types
// TODO: Extract common types from API
export {};
'@
Set-Content -Path "packages/shared/src/types/index.ts" -Value $sharedTypesIndex

$sharedConstantsIndex = @'
// Shared constants
// TODO: Extract common constants from API
export {};
'@
Set-Content -Path "packages/shared/src/constants/index.ts" -Value $sharedConstantsIndex
Write-Host "  ✓ Created shared package files" -ForegroundColor Gray

# Update root .gitignore
Write-Host "Step 7: Updating root .gitignore..." -ForegroundColor Green
$rootGitignore = @'
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
'@
Set-Content -Path ".gitignore" -Value $rootGitignore
Write-Host "  ✓ Updated .gitignore" -ForegroundColor Gray

# Update root README
Write-Host "Step 8: Updating root README..." -ForegroundColor Green
$rootReadme = @'
# DEC_L - Digital Exchange Classifieds

A modern classifieds platform with separate API and web applications.

## Project Structure

```
DEC_L/
├── apps/
│   ├── api/          Backend REST API (Express + TypeScript + Prisma)
│   └── web/          Frontend application (SvelteKit + TypeScript)
├── packages/
│   └── shared/       Shared types and utilities
├── docker/           Docker configuration
└── documentation/    Project documentation
```

## Quick Start

### Install Dependencies
```bash
npm install
```

### Development
```bash
# Run API only
npm run dev:api

# Run Web only (after setup)
npm run dev:web

# Run both
npm run dev
```

### Testing
```bash
# Test API
npm run test:api

# Test all
npm test
```

### Building
```bash
# Build API
npm run build:api

# Build all
npm run build
```

### Docker
```bash
# Development
npm run docker:dev

# Production
npm run docker:prod

# Stop containers
npm run docker:down
```

## Documentation

- [API Documentation](./apps/api/README.md)
- [Implementation Guide](./documentation/README.md)
- [Restructure Plan](./RESTRUCTURE_PLAN.md)

## Tech Stack

### Backend (API)
- Node.js + Express 5.2.1
- TypeScript
- Prisma ORM + SQL Server
- JWT Authentication
- Jest + SuperTest

### Frontend (Web)
- SvelteKit
- TypeScript
- TailwindCSS
- Vite

## License

MIT
'@
Set-Content -Path "README.md" -Value $rootReadme
Write-Host "  ✓ Updated README.md" -ForegroundColor Gray

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. cd apps/api && npm install" -ForegroundColor White
Write-Host "2. npm test (verify API works)" -ForegroundColor White
Write-Host "3. cd ../.. && npm install (install root workspace)" -ForegroundColor White
Write-Host "4. npm run dev:api (test workspace commands)" -ForegroundColor White
Write-Host "5. git add . && git commit -m 'Restructure to monorepo'" -ForegroundColor White
Write-Host ""
Write-Host "To rollback: git reset --hard pre-restructure-backup" -ForegroundColor Gray
Write-Host ""
