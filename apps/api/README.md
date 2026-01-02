# Tunda Plug API

Backend REST API for the Tunda Plug classifieds platform.

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
