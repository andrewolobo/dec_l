import type { Meta, StoryObj } from '@storybook/svelte';
import SearchBar from './SearchBar.svelte';

const meta = {
	title: 'Components/Forms/SearchBar',
	component: SearchBar,
	tags: ['autodocs'],
	argTypes: {
		placeholder: { control: 'text' },
		value: { control: 'text' },
		disabled: { control: 'boolean' },
		loading: { control: 'boolean' },
		label: { control: 'text' },
		error: { control: 'text' },
		required: { control: 'boolean' },
		category: { control: 'text' },
		filters: { control: 'object' },
		suggestions: { control: 'object' }
	}
} satisfies Meta<SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Search...'
	}
};

export const WithPlaceholder: Story = {
	args: {
		placeholder: 'Search for products, users, or posts...'
	}
};

export const WithValue: Story = {
	args: {
		value: 'vintage jacket',
		placeholder: 'Search...'
	}
};

export const Loading: Story = {
	args: {
		value: 'searching...',
		loading: true,
		placeholder: 'Search...'
	}
};

export const Disabled: Story = {
	args: {
		placeholder: 'Search...',
		disabled: true
	}
};

export const ProductSearch: Story = {
	args: {
		placeholder: 'Search for products by name, brand, or category...'
	}
};

export const UserSearch: Story = {
	args: {
		placeholder: 'Find users by name or username...'
	}
};

export const GlobalSearch: Story = {
	args: {
		placeholder: 'Search everything...'
	}
};

export const WithCategories: Story = {
	args: {
		placeholder: 'Search in Fashion...',
		category: 'Fashion'
	}
};

export const HeaderSearch: Story = {
	render: () => ({
		Component: SearchBar,
		slot: `
			<div style="max-width: 600px; padding: 1rem; background: #1a1a1a; border-radius: 0.5rem;">
				<SearchBar placeholder="Search Tunda Plug..." />
			</div>
		`
	})
};

export const FilterPanel: Story = {
	render: () => ({
		Component: SearchBar,
		slot: `
			<div style="max-width: 400px; padding: 1.5rem; background: var(--color-background); border: 1px solid var(--color-border); border-radius: 0.5rem;">
				<h3 style="margin-bottom: 1rem; font-weight: 600;">Filter Products</h3>
				<SearchBar placeholder="Search within results..." />
			</div>
		`
	})
};

export const SearchResults: Story = {
	render: () => ({
		Component: SearchBar,
		slot: `
			<div style="max-width: 800px;">
				<SearchBar value="vintage leather jacket" placeholder="Search..." />
				<div style="margin-top: 1rem; padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.5rem;">
					<p style="color: var(--color-text-secondary); font-size: 0.875rem;">
						Found 24 results for "vintage leather jacket"
					</p>
				</div>
			</div>
		`
	})
};

export const ResponsiveSearch: Story = {
	render: () => ({
		Component: SearchBar,
		slot: `
			<div style="display: flex; flex-direction: column; gap: 1rem;">
				<div style="max-width: 800px;">
					<p style="margin-bottom: 0.5rem; font-weight: 600;">Desktop</p>
					<SearchBar placeholder="Search products, users, posts..." />
				</div>
				<div style="max-width: 400px;">
					<p style="margin-bottom: 0.5rem; font-weight: 600;">Mobile</p>
					<SearchBar placeholder="Search..." />
				</div>
			</div>
		`
	})
};

export const AllStates: Story = {
	render: () => ({
		Component: SearchBar,
		slot: `
			<div style="max-width: 600px; display: flex; flex-direction: column; gap: 1.5rem;">
				<div>
					<h3 style="margin-bottom: 0.5rem; font-weight: 600;">Default</h3>
					<SearchBar placeholder="Search..." />
				</div>
				<div>
					<h3 style="margin-bottom: 0.5rem; font-weight: 600;">With Value</h3>
					<SearchBar value="search query" placeholder="Search..." />
				</div>
				<div>
					<h3 style="margin-bottom: 0.5rem; font-weight: 600;">Loading</h3>
					<SearchBar value="searching..." loading placeholder="Search..." />
				</div>
				<div>
					<h3 style="margin-bottom: 0.5rem; font-weight: 600;">Disabled</h3>
					<SearchBar placeholder="Search..." disabled />
				</div>
			</div>
		`
	})
};
