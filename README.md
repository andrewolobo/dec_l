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

- API Documentation: [apps/api/README.md](apps/api/README.md)
- Implementation Guide: [documentation/README.md](documentation/README.md)
- Restructure Plan: [RESTRUCTURE_PLAN.md](RESTRUCTURE_PLAN.md)

## Tech Stack

### Backend (API)

- Node.js + Express 5.2.1
- TypeScript
- Prisma ORM + SQL Server
- JWT Authentication
- Jest + SuperTest

### Frontend (Web)

- SvelteKit (To be initialized)
- TypeScript
- TailwindCSS
- Vite

## License

MIT
