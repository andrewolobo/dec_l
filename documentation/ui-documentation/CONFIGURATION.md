# Configuration Documentation

## Path Aliases

The following path aliases are configured in `svelte.config.js`:

- `$lib` → `src/lib`
- `$components` → `src/lib/components`
- `$stores` → `src/lib/stores`
- `$services` → `src/lib/services`
- `$utils` → `src/lib/utils`
- `$types` → `src/lib/types`

### Usage Example

```typescript
import { config } from '$lib/config';
import { LoadingSpinner } from '$components/common';
import { formatCurrency } from '$utils/formatters';
```

## Environment Variables

All environment variables must be prefixed with `VITE_` to be exposed to the client.

See `.env.example` for all available configuration options.

### Key Configurations

- **API**: Base URL, timeout, retry settings
- **OAuth**: Google, Microsoft, Facebook client IDs
- **Upload**: File size limits, allowed types
- **Feed**: Pagination, caching, infinite scroll
- **Features**: Toggle dark mode, notifications, PWA

### Accessing Config

```typescript
import { config } from '$lib/config';

// API configuration
console.log(config.api.baseUrl);

// Feature flags
if (config.features.darkMode) {
	// Enable dark mode
}
```

## Fonts

- **Primary Font**: Plus Jakarta Sans (400, 500, 600, 700, 800)
- **Icons**: Material Symbols Outlined

Both are loaded via Google Fonts in `app.css`.

## Tailwind Theme

Custom theme includes:

- Primary color: Cyan (#13ecec)
- Secondary, success, warning, error color scales
- Custom shadows (card, card-hover, modal)
- Custom animations (fade-in, slide-up, slide-down)
- Utility classes (btn, input, card, etc.)

## Constants

All application constants are defined in `src/lib/config/constants.ts`:

- Storage keys
- API endpoints
- Validation rules
- Error/success messages
- Routes
- Status constants
