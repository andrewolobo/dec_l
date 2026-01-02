# Button & Action Components

A collection of reusable button and action components for the Tunda Plug application.

## Components

### Button

Primary interactive button with multiple variants and states.

**Props:**

- `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'` - Visual style (default: 'primary')
- `size?: 'sm' | 'md' | 'lg'` - Button size (default: 'md')
- `loading?: boolean` - Show loading spinner (default: false)
- `disabled?: boolean` - Disable button (default: false)
- `icon?: string` - Material Symbol icon name
- `iconPosition?: 'left' | 'right'` - Icon placement (default: 'left')
- `fullWidth?: boolean` - Make button full width (default: false)
- `type?: 'button' | 'submit' | 'reset'` - HTML button type (default: 'button')
- `onclick?: () => void` - Click handler

**Example:**

```svelte
<script>
	import { Button } from '$lib/components/buttons';
</script>

<Button variant="primary" icon="add" onclick={() => console.log('Clicked')}>Create Post</Button>

<Button variant="secondary" size="lg" fullWidth>Cancel</Button>

<Button variant="danger" loading>Deleting...</Button>
```

---

### IconButton

Icon-only button for compact actions with optional badge.

**Props:**

- `icon: string` - Material Symbol icon name (required)
- `size?: 'sm' | 'md' | 'lg'` - Button size (default: 'md')
- `variant?: 'default' | 'primary' | 'danger'` - Visual style (default: 'default')
- `ariaLabel: string` - Accessibility label (required)
- `badge?: number | boolean` - Badge indicator (number or dot)
- `disabled?: boolean` - Disable button (default: false)
- `onclick?: () => void` - Click handler

**Example:**

```svelte
<script>
	import { IconButton } from '$lib/components/buttons';
</script>

<IconButton icon="notifications" ariaLabel="Notifications" badge={5} />

<IconButton icon="settings" ariaLabel="Settings" variant="primary" />

<IconButton icon="delete" ariaLabel="Delete" variant="danger" size="sm" />
```

---

### LikeButton

Like/unlike button with animated heart icon and count display.

**Props:**

- `liked: boolean` - Current like state (bindable)
- `count: number` - Like count (bindable)
- `disabled?: boolean` - Disable button (default: false)
- `onToggle?: (liked: boolean) => void` - Callback when toggled

**Example:**

```svelte
<script>
	import { LikeButton } from '$lib/components/buttons';

	let liked = $state(false);
	let count = $state(42);
</script>

<LikeButton bind:liked bind:count onToggle={(newState) => console.log('Liked:', newState)} />
```

---

### ShareButton

Share content via multiple channels (WhatsApp, Facebook, Twitter, Copy Link).

**Props:**

- `url: string` - URL to share (required)
- `title: string` - Share title (required)
- `description?: string` - Share description
- `image?: string` - Share image URL

**Features:**

- Uses native share API on mobile when available
- Falls back to share menu with multiple options
- Animated "Copied!" feedback for copy link
- Closes automatically after selection

**Example:**

```svelte
<script>
	import { ShareButton } from '$lib/components/buttons';
</script>

<ShareButton
	url="https://tundaplug.com/posts/123"
	title="Vintage Leather Chair"
	description="Beautiful vintage chair in great condition"
	image="https://tundaplug.com/images/chair.jpg"
/>
```

---

### FollowButton

Follow/unfollow user button with hover state changes.

**Props:**

- `following: boolean` - Current follow state (bindable)
- `userId: string` - User ID to follow/unfollow (required)
- `disabled?: boolean` - Disable button (default: false)
- `onToggle?: (following: boolean) => void` - Callback when toggled

**Features:**

- Shows "Follow" when not following
- Shows "Following" when following
- Shows "Unfollow" on hover when following (red variant)
- Optimistic UI updates
- Loading state during API calls

**Example:**

```svelte
<script>
	import { FollowButton } from '$lib/components/buttons';

	let following = $state(false);
</script>

<FollowButton
	bind:following
	userId="user-123"
	onToggle={async (newState) => {
		// Call API
		await fetch(`/api/users/user-123/follow`, {
			method: newState ? 'POST' : 'DELETE'
		});
	}}
/>
```

---

### DropdownMenu

Contextual menu with keyboard navigation support.

**Props:**

- `items: MenuItem[]` - Menu items array (required)
- `trigger?: 'click' | 'hover'` - Open trigger (default: 'click')
- `position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'` - Menu position (default: 'bottom-right')
- `align?: 'start' | 'end'` - Menu alignment (default: 'end')

**MenuItem Interface:**

```typescript
interface MenuItem {
	label: string;
	icon?: string;
	action: () => void;
	danger?: boolean;
	divider?: boolean;
}
```

**Features:**

- Click outside to close
- Keyboard navigation (Arrow keys, Enter, Escape)
- Divider support
- Danger items (red styling)
- Icon support

**Example:**

```svelte
<script>
	import { DropdownMenu, IconButton } from '$lib/components/buttons';
	import type { MenuItem } from '$lib/components/buttons';

	const menuItems: MenuItem[] = [
		{ label: 'Edit', icon: 'edit', action: () => console.log('Edit') },
		{ label: 'Share', icon: 'share', action: () => console.log('Share') },
		{ divider: true },
		{ label: 'Delete', icon: 'delete', action: () => console.log('Delete'), danger: true }
	];
</script>

<DropdownMenu items={menuItems} position="bottom-right">
	<IconButton icon="more_vert" ariaLabel="More options" />
</DropdownMenu>
```

---

## Design System

### Colors

All components follow the application's color system:

- **Primary:** `#13ecec` (cyan/turquoise)
- **Background Light:** `#f6f8f8`
- **Background Dark:** `#102222`
- **Danger:** `#ef4444` (red-500)

### Sizes

- **sm:** Small (height: 32px)
- **md:** Medium (height: 40px)
- **lg:** Large (height: 48px)

### Dark Mode

All components support dark mode via Tailwind's `dark:` variant.

---

## Accessibility

All components include:

- Proper ARIA labels
- Keyboard navigation support
- Focus states
- Disabled states
- Screen reader friendly markup

---

## Usage Tips

1. **Import from barrel export:**

   ```svelte
   import {(Button, IconButton, DropdownMenu)} from '$lib/components/buttons';
   ```

2. **Combine components:**

   ```svelte
   <DropdownMenu items={menuItems}>
   	<IconButton icon="more_vert" ariaLabel="More options" />
   </DropdownMenu>
   ```

3. **Use with bindable state:**

   ```svelte
   <LikeButton bind:liked bind:count />
   <FollowButton bind:following userId="123" />
   ```

4. **Consistent styling:**
   - All buttons use rounded-xl corners
   - Consistent hover/active states
   - Shadow effects on primary/danger variants
