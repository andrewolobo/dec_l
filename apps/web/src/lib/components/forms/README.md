# Form Components

A comprehensive collection of 12 reusable form components built with Svelte for the Tunda Plug application.

## Components

### Basic Inputs

#### Input.svelte

Text input field with validation and icon support.

- Types: text, email, password, tel, url, number
- Icon positioning (left/right)
- Error state and validation
- Disabled state
- Required field indicator

#### TextArea.svelte

Multi-line text input with character counter.

- Auto-resize option
- Character counter
- Min/max length validation
- Disabled state

#### PriceInput.svelte

Currency input with formatting.

- Multiple currency support (UGX, USD, EUR, GBP)
- Thousands separator formatting
- Min/max value validation
- Stepper buttons

#### PhoneInput.svelte

Phone number input with country code selector.

- Country code dropdown
- Format validation
- Uganda-specific formatting (9 digits)
- International number support

### Selection Components

#### Select.svelte

Dropdown selection with optional search.

- Single and multiple selection
- Searchable options
- Keyboard navigation
- Custom styling

#### Checkbox.svelte

Single checkbox input.

- Custom styling
- Indeterminate state
- Label clickable
- Disabled state

#### Radio.svelte

Radio button group.

- Horizontal/vertical layout
- Custom styling
- Disabled state
- Group label

#### Toggle.svelte

Toggle switch for boolean settings.

- Multiple sizes (sm, md, lg)
- Smooth animation
- Disabled state
- Optional label

### Advanced Components

#### FileUpload.svelte

File input with drag & drop support.

- Drag & drop zone
- File validation (type, size)
- Preview thumbnails
- Multiple files support
- Progress indicators

#### ImageUploader.svelte

Specialized image uploader with preview and reordering.

- Multi-image upload (up to 5)
- Drag to reorder
- Image preview
- Set primary image
- Automatic compression

#### DateTimePicker.svelte

Date and time selection.

- Calendar popup
- Time selection
- Min/max date restrictions
- Keyboard navigation
- Format customization

#### SearchBar.svelte

Search input with suggestions and filters.

- Autocomplete suggestions
- Recent searches
- Filter chips
- Clear button
- Loading indicator

## Usage

```svelte
<script>
	import { Input, Select, Checkbox } from '$lib/components/forms';
	import type { SelectOption } from '$lib/components/forms';

	let email = '';
	let category = '';
	let acceptTerms = false;

	const categories: SelectOption[] = [
		{ value: '1', label: 'Electronics' },
		{ value: '2', label: 'Furniture' },
		{ value: '3', label: 'Clothing' }
	];
</script>

<Input
	type="email"
	label="Email"
	placeholder="Enter your email"
	bind:value={email}
	icon="mail"
	required
/>

<Select label="Category" options={categories} bind:value={category} searchable />

<Checkbox label="I accept the terms and conditions" bind:checked={acceptTerms} />
```

## Types

All TypeScript types are exported from the index file:

- `SelectOption` - Option interface for Select component
- `RadioOption` - Option interface for Radio component
- `SearchFilter` - Filter interface for SearchBar component

## Features

- **Accessibility**: All components follow WCAG guidelines with proper ARIA labels and keyboard navigation
- **Dark Mode**: Full dark mode support with CSS variables
- **Validation**: Built-in error states and validation feedback
- **Responsive**: Mobile-first design that works across all devices
- **TypeScript**: Fully typed with proper interfaces
- **Events**: All components dispatch proper events for state changes

## CSS Variables

Components use the following CSS variables for theming:

- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--input-bg`, `--border-color`, `--border-hover`
- `--primary-color`, `--primary-color-alpha`
- `--error-color`, `--error-color-alpha`
- `--hover-bg`, `--disabled-bg`
- `--dropdown-bg`, `--card-bg`

## Implementation Status

✅ All 12 form components implemented
✅ TypeScript types defined
✅ Accessibility features added
✅ Dark mode support
✅ Event handlers
✅ Validation states

## Next Steps

- Add unit tests for each component
- Create Storybook stories for documentation
- Add form validation helper utilities
- Create form builder wrapper component
