# Tunda Plug Web UI

Modern classifieds platform built with SvelteKit, TypeScript, and TailwindCSS.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Running Tunda Plug API server (see `apps/api`)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

The application will be available at http://localhost:5173

## Development

```bash
# Start dev server
npm run dev

# Type checking
npm run check
npm run check:watch

# Linting
npm run lint

# Formatting
npm run format

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

- `src/lib/components/` - Reusable UI components
- `src/lib/stores/` - Svelte stores for state management
- `src/lib/services/` - API service layer
- `src/lib/types/` - TypeScript type definitions
- `src/lib/utils/` - Utility functions
- `src/routes/` - SvelteKit file-based routing

## Tech Stack

- **SvelteKit 2.5+** - Full-stack framework
- **Svelte 5** - Reactive UI with runes API
- **TypeScript 5.6+** - Type safety
- **TailwindCSS 3.4+** - Utility-first styling
- **Axios** - HTTP client
- **Zod** - Schema validation

## Documentation

See [documentation/8. WEB_UI_IMPLEMENTATION_PLAN.md](../../documentation/8.%20WEB_UI_IMPLEMENTATION_PLAN.md) for the complete implementation plan.
