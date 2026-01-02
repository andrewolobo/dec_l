# Media & Display Components

A collection of reusable media and display components for the Tunda Plug application.

## Components

### Avatar

User profile picture with status indicators and badges.

**Props:**

- `src?: string` - Image URL
- `alt: string` - Alt text (required, used for initials fallback)
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Avatar size (default: 'md')
- `status?: 'online' | 'offline' | 'away'` - Status indicator
- `badge?: string` - Material Symbol icon name for badge (e.g., 'verified', 'admin')
- `editable?: boolean` - Show camera icon overlay on hover (default: false)
- `onclick?: () => void` - Click handler

**Features:**

- Automatic initials generation from alt text when no image provided
- Online/offline/away status indicators with colored dots
- Gradient fallback background
- Badge icon support (verified, admin, etc.)
- Editable mode with camera icon overlay
- Keyboard accessible when clickable

**Example:**

```svelte
<script>
	import { Avatar } from '$lib/components/media';
</script>

<!-- With image -->
<Avatar src="/user.jpg" alt="John Doe" size="lg" status="online" />

<!-- Initials fallback -->
<Avatar alt="Jane Smith" size="md" badge="verified" />

<!-- Editable avatar -->
<Avatar
	src="/profile.jpg"
	alt="Current User"
	editable
	onclick={() => console.log('Change avatar')}
/>
```

**Sizes:**

- `xs`: 24px (1.5rem)
- `sm`: 32px (2rem)
- `md`: 40px (2.5rem)
- `lg`: 48px (3rem)
- `xl`: 64px (4rem)

---

### ImageCarousel

Multi-image viewer with navigation, thumbnails, and touch gestures.

**Props:**

- `images: string[]` - Array of image URLs (required)
- `aspectRatio?: string` - Aspect ratio (default: '16:9', options: '4:3', '1:1', '3:4')
- `autoPlay?: boolean` - Enable auto-advance (default: false)
- `autoPlayInterval?: number` - Auto-play interval in ms (default: 3000)
- `showThumbnails?: boolean` - Show thumbnail strip (default: false)
- `showCounter?: boolean` - Show image counter (default: true)
- `onImageClick?: (index: number) => void` - Callback when image is clicked

**Features:**

- Swipe/drag navigation (mouse and touch)
- Arrow button navigation
- Dot indicators (for ≤5 images)
- Image counter (e.g., "1/5")
- Optional thumbnail strip
- Auto-play with interval reset on interaction
- Keyboard navigation (Arrow keys, Enter, Space)
- Responsive aspect ratios

**Example:**

```svelte
<script>
	import { ImageCarousel } from '$lib/components/media';

	const images = ['/posts/image1.jpg', '/posts/image2.jpg', '/posts/image3.jpg'];
</script>

<ImageCarousel
	{images}
	aspectRatio="1:1"
	showThumbnails
	onImageClick={(index) => openLightbox(index)}
/>

<!-- With auto-play -->
<ImageCarousel {images} autoPlay autoPlayInterval={5000} showCounter />
```

---

### Badge

Status indicator, counter, or label badge.

**Props:**

- `variant?: 'status' | 'count' | 'label'` - Badge type (default: 'label')
- `color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'` - Color theme (default: 'primary')
- `size?: 'sm' | 'md' | 'lg'` - Badge size (default: 'md')
- `dot?: boolean` - Show dot indicator (default: false)
- `pulse?: boolean` - Animate dot with pulse effect (default: false)

**Features:**

- Three variants: status dot, count bubble, label pill
- Five color themes with dark mode support
- Pulse animation for status indicators
- Optional dot prefix for labels

**Example:**

```svelte
<script>
	import { Badge } from '$lib/components/media';
</script>

<!-- Status dot -->
<Badge variant="status" color="success" dot pulse />

<!-- Count badge -->
<Badge variant="count" color="danger">5</Badge>

<!-- Label badge -->
<Badge color="primary">Active</Badge>

<!-- Label with dot -->
<Badge color="warning" dot>Pending</Badge>
```

---

### Tag

Labeled tag or chip with optional icon and remove button.

**Props:**

- `label: string` - Tag text (required)
- `color?: string` - Custom color (hex/rgb)
- `removable?: boolean` - Show remove button (default: false)
- `icon?: string` - Material Symbol icon name
- `size?: 'sm' | 'md' | 'lg'` - Tag size (default: 'md')
- `onRemove?: () => void` - Callback when removed
- `onclick?: () => void` - Click handler

**Features:**

- Custom color support with automatic contrast
- Icon prefix support
- Removable with X button
- Clickable action support
- Keyboard accessible
- Dark mode support

**Example:**

```svelte
<script>
	import { Tag } from '$lib/components/media';

	let tags = $state(['Furniture', 'Vintage', 'Wood']);

	function removeTag(index: number) {
		tags = tags.filter((_, i) => i !== index);
	}
</script>

<!-- Basic tags -->
<Tag label="Electronics" icon="devices" />
<Tag label="Home & Garden" color="#22c55e" />

<!-- Removable tags -->
{#each tags as tag, index}
	<Tag label={tag} removable onRemove={() => removeTag(index)} />
{/each}

<!-- Clickable tag -->
<Tag label="Filter by location" icon="location_on" onclick={() => openLocationFilter()} />
```

---

### ProgressBar

Progress indicator with labels and animations.

**Props:**

- `value: number` - Current progress value (required)
- `max?: number` - Maximum value (default: 100)
- `label?: string` - Progress label
- `showPercentage?: boolean` - Show percentage text (default: false)
- `color?: string` - Custom color (Tailwind class like 'bg-green-500')
- `striped?: boolean` - Striped pattern (default: false)
- `animated?: boolean` - Animate stripes (default: false, requires striped=true)
- `size?: 'sm' | 'md' | 'lg'` - Bar height (default: 'md')

**Features:**

- Smooth progress transitions
- Optional label and percentage display
- Striped pattern with animation
- Custom colors
- Three size variants
- Accessible with ARIA attributes

**Example:**

```svelte
<script>
	import { ProgressBar } from '$lib/components/media';

	let uploadProgress = $state(0);
</script>

<!-- Simple progress -->
<ProgressBar value={75} showPercentage />

<!-- Labeled progress -->
<ProgressBar value={uploadProgress} label="Uploading images..." showPercentage />

<!-- Striped and animated -->
<ProgressBar value={50} striped animated color="bg-green-500" label="Processing" />

<!-- Custom max value -->
<ProgressBar value={3} max={10} label="3 of 10 items completed" />
```

**Sizes:**

- `sm`: 4px height
- `md`: 8px height
- `lg`: 12px height

---

## Design System

### Colors

All components follow the application's color system:

- **Primary:** `#13ecec` (cyan/turquoise)
- **Success:** `#22c55e` (green-500)
- **Warning:** `#eab308` (yellow-500)
- **Danger:** `#ef4444` (red-500)
- **Info:** `#3b82f6` (blue-500)

### Status Colors

- **Online:** Green (#22c55e)
- **Offline:** Gray (#9ca3af)
- **Away:** Yellow (#eab308)

### Dark Mode

All components include dark mode variants with proper contrast and visibility.

---

## Accessibility

All components include:

- Proper ARIA attributes
- Keyboard navigation support
- Focus indicators
- Screen reader friendly labels
- Semantic HTML

---

## Usage Tips

1. **Import from barrel export:**

   ```svelte
   import {(Avatar, Badge, Tag, ImageCarousel, ProgressBar)} from '$lib/components/media';
   ```

2. **Avatar initials:**
   - Automatically generates initials from `alt` prop
   - Takes first letter of each word, up to 2 letters
   - Example: "John Doe" → "JD"

3. **ImageCarousel gestures:**
   - Mouse drag or touch swipe to navigate
   - Arrow buttons appear on hover
   - Keyboard: Arrow Left/Right, Enter, Space
   - Click image to trigger `onImageClick` callback

4. **Badge variants:**
   - Use `status` with `dot` for online indicators
   - Use `count` for notification counters
   - Use `label` for post status, categories, etc.

5. **Tag colors:**
   - Pass any valid CSS color to `color` prop
   - Component automatically creates light background
   - Falls back to gray theme if no color specified

6. **ProgressBar animations:**
   - Set both `striped` and `animated` for moving stripes
   - Use custom Tailwind classes for `color` prop
   - Automatically caps percentage at 0-100%
