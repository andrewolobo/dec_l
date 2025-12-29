# DEC_L Directory Restructure Migration Script
# Execute this script from the project root

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
git add . 2>&1 | Out-Null
git commit -m "Pre-restructure checkpoint - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 2>&1 | Out-Null
git tag pre-restructure-backup 2>&1 | Out-Null
Write-Host "  ✓ Backup created" -ForegroundColor Gray

Write-Host "Step 2: Creating branch..." -ForegroundColor Green
git checkout -b restructure/monorepo 2>&1 | Out-Null
Write-Host "  ✓ Branch created" -ForegroundColor Gray

Write-Host "Step 3: Creating directory structure..." -ForegroundColor Green
New-Item -ItemType Directory -Path "apps/api" -Force | Out-Null
New-Item -ItemType Directory -Path "apps/web" -Force | Out-Null
New-Item -ItemType Directory -Path "packages/shared/src/types" -Force | Out-Null
New-Item -ItemType Directory -Path "packages/shared/src/constants" -Force | Out-Null
New-Item -ItemType Directory -Path "docker" -Force | Out-Null
Write-Host "  ✓ Directories created" -ForegroundColor Gray

Write-Host "Step 4: Moving API files..." -ForegroundColor Green

# Move source code
if (Test-Path "src") {
    Move-Item -Path "src" -Destination "apps/api/src" -Force
    Write-Host "  ✓ Moved src/" -ForegroundColor Gray
}

# Move configuration files
$configFiles = @("package.json", "package-lock.json", "tsconfig.json", "jest.config.js", "prisma.config.ts")
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
$buildDirs = @("api-tests", "coverage", "dist", "node_modules")
foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        Move-Item -Path $dir -Destination "apps/api/$dir" -Force
        Write-Host "  ✓ Moved $dir/" -ForegroundColor Gray
    }
}

# Copy environment file
if (Test-Path ".env") {
    Copy-Item -Path ".env" -Destination "apps/api/.env" -Force
    Write-Host "  ✓ Copied .env to apps/api/" -ForegroundColor Gray
}

Write-Host "Step 5: Creating configuration files..." -ForegroundColor Green

# Create root package.json using native PowerShell
$rootPackage = @{
    name            = "dec_l"
    version         = "1.0.0"
    private         = $true
    description     = "Digital Exchange Classifieds - Monorepo"
    workspaces      = @("apps/*", "packages/*")
    scripts         = @{
        "dev:api"          = "npm run dev --workspace=apps/api"
        "dev:web"          = "npm run dev --workspace=apps/web"
        "dev"              = "concurrently `"npm run dev:api`" `"npm run dev:web`""
        "build:api"        = "npm run build --workspace=apps/api"
        "build:web"        = "npm run build --workspace=apps/web"
        "build"            = "npm run build:api; npm run build:web"
        "test:api"         = "npm run test --workspace=apps/api"
        "test:web"         = "npm run test --workspace=apps/web"
        "test"             = "npm run test:api; npm run test:web"
        "docker:dev"       = "docker-compose -f docker/docker-compose.yml up"
        "docker:dev:build" = "docker-compose -f docker/docker-compose.yml up --build"
        "docker:prod"      = "docker-compose -f docker/docker-compose.prod.yml up -d"
        "docker:down"      = "docker-compose -f docker/docker-compose.yml down"
        "clean"            = "npm run clean --workspaces --if-present"
    }
    devDependencies = @{
        concurrently = "^8.2.2"
    }
}
$rootPackage | ConvertTo-Json -Depth 10 | Set-Content "package.json"
Write-Host "  ✓ Created root package.json" -ForegroundColor Gray

# Update API package.json
$apiPackage = Get-Content "apps/api/package.json" -Raw | ConvertFrom-Json
$apiPackage.name = "@dec_l/api"
$apiPackage.description = "DEC_L Backend API"
$apiPackage.scripts | Add-Member -NotePropertyName "clean" -NotePropertyValue "rm -rf dist coverage node_modules" -Force
$apiPackage.scripts | Add-Member -NotePropertyName "prisma:generate" -NotePropertyValue "prisma generate" -Force
$apiPackage.scripts | Add-Member -NotePropertyName "prisma:migrate" -NotePropertyValue "prisma migrate dev" -Force
$apiPackage.scripts | Add-Member -NotePropertyName "prisma:studio" -NotePropertyValue "prisma studio" -Force
$apiPackage | ConvertTo-Json -Depth 10 | Set-Content "apps/api/package.json"
Write-Host "  ✓ Updated apps/api/package.json" -ForegroundColor Gray

# Create API .gitignore
@"
node_modules/
dist/
coverage/
.env
.env.local
*.log
.DS_Store
"@ | Set-Content "apps/api/.gitignore"
Write-Host "  ✓ Created apps/api/.gitignore" -ForegroundColor Gray

# Create API README
@"
# DEC_L API

Backend REST API for the DEC_L classifieds platform.

## Tech Stack
- Node.js + Express 5.2.1
- TypeScript
- Prisma ORM + SQL Server
- JWT Authentication
- Jest for testing

## Getting Started

``````bash
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
``````

## API Documentation
See /api-tests folder for HTTP request examples.

## Environment Variables
Copy .env.example to .env and configure:
- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- OAuth credentials (optional)
"@ | Set-Content "apps/api/README.md"
Write-Host "  ✓ Created apps/api/README.md" -ForegroundColor Gray

Write-Host "Step 6: Creating shared package..." -ForegroundColor Green

# Create shared package.json
$sharedPackage = @{
    name            = "@dec_l/shared"
    version         = "1.0.0"
    description     = "Shared types and utilities for DEC_L"
    main            = "./src/index.ts"
    types           = "./src/index.ts"
    exports         = @{
        "."           = "./src/index.ts"
        "./types"     = "./src/types/index.ts"
        "./constants" = "./src/constants/index.ts"
    }
    scripts         = @{
        build = "tsc"
        clean = "rm -rf dist"
    }
    devDependencies = @{
        typescript = "^5.9.3"
    }
}
$sharedPackage | ConvertTo-Json -Depth 10 | Set-Content "packages/shared/package.json"
Write-Host "  ✓ Created packages/shared/package.json" -ForegroundColor Gray

# Create shared tsconfig
$sharedTsConfig = @{
    compilerOptions = @{
        target                           = "ES2020"
        module                           = "commonjs"
        lib                              = @("ES2020")
        declaration                      = $true
        declarationMap                   = $true
        outDir                           = "./dist"
        rootDir                          = "./src"
        strict                           = $true
        esModuleInterop                  = $true
        skipLibCheck                     = $true
        forceConsistentCasingInFileNames = $true
        resolveJsonModule                = $true
        moduleResolution                 = "node"
    }
    include         = @("src/**/*")
    exclude         = @("node_modules", "dist")
}
$sharedTsConfig | ConvertTo-Json -Depth 10 | Set-Content "packages/shared/tsconfig.json"
Write-Host "  ✓ Created packages/shared/tsconfig.json" -ForegroundColor Gray

# Create shared source files
"// Export all shared types and constants`nexport * from './types';`nexport * from './constants';" | Set-Content "packages/shared/src/index.ts"
"// Shared TypeScript types`n// TODO: Extract common types from API`nexport {};" | Set-Content "packages/shared/src/types/index.ts"
"// Shared constants`n// TODO: Extract common constants from API`nexport {};" | Set-Content "packages/shared/src/constants/index.ts"
Write-Host "  ✓ Created shared package files" -ForegroundColor Gray

Write-Host "Step 7: Updating root files..." -ForegroundColor Green

# Update root .gitignore
@"
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
"@ | Set-Content ".gitignore"
Write-Host "  ✓ Updated .gitignore" -ForegroundColor Gray

# Update root README
@"
# DEC_L - Digital Exchange Classifieds

A modern classifieds platform with separate API and web applications.

## Project Structure

``````
DEC_L/
├── apps/
│   ├── api/          Backend REST API (Express + TypeScript + Prisma)
│   └── web/          Frontend application (SvelteKit + TypeScript)
├── packages/
│   └── shared/       Shared types and utilities
├── docker/           Docker configuration
└── documentation/    Project documentation
``````

## Quick Start

### Install Dependencies
``````bash
npm install
``````

### Development
``````bash
# Run API only
npm run dev:api

# Run Web only (after setup)
npm run dev:web

# Run both
npm run dev
``````

### Testing
``````bash
# Test API
npm run test:api

# Test all
npm test
``````

### Building
``````bash
# Build API
npm run build:api

# Build all
npm run build
``````

### Docker
``````bash
# Development
npm run docker:dev

# Production
npm run docker:prod

# Stop containers
npm run docker:down
``````

## Documentation

- API Documentation: ./apps/api/README.md
- Implementation Guide: ./documentation/README.md
- Restructure Plan: ./RESTRUCTURE_PLAN.md

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
"@ | Set-Content "README.md"
Write-Host "  ✓ Updated README.md" -ForegroundColor Gray

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. cd apps/api" -ForegroundColor White
Write-Host "2. npm install" -ForegroundColor White
Write-Host "3. npm test (verify API works)" -ForegroundColor White
Write-Host "4. cd ../.." -ForegroundColor White
Write-Host "5. npm install (install root workspace)" -ForegroundColor White
Write-Host "6. npm run dev:api (test workspace commands)" -ForegroundColor White
Write-Host ""
Write-Host "To rollback: git reset --hard pre-restructure-backup" -ForegroundColor Gray
Write-Host ""
