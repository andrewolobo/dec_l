import type { Meta, StoryObj } from '@storybook/svelte';
import AppShell from './AppShell.svelte';

const meta = {
	title: 'Components/Layout/AppShell',
	component: AppShell,
	tags: ['autodocs'],
	parameters: {
		layout: 'fullscreen'
	}
} satisfies Meta<AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		Component: AppShell,
		slot: `
			<div style="padding: 2rem;">
				<h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 1rem;">Welcome to Tunda Plug</h1>
				<p style="color: var(--color-text-secondary);">The main content area of your application.</p>
			</div>
		`
	})
};

export const WithSidebar: Story = {
	render: () => ({
		Component: AppShell,
		slot: `
			<AppShell showSidebar>
				<div style="padding: 2rem;">
					<h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 1rem;">Dashboard</h1>
					<p style="color: var(--color-text-secondary);">View with sidebar navigation.</p>
				</div>
			</AppShell>
		`
	})
};

export const MobileView: Story = {
	parameters: {
		viewport: {
			defaultViewport: 'mobile1'
		}
	},
	render: () => ({
		Component: AppShell,
		slot: `
			<div style="padding: 1rem;">
				<h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Mobile View</h1>
				<p style="color: var(--color-text-secondary); font-size: 0.875rem;">Bottom navigation visible on mobile.</p>
			</div>
		`
	})
};

export const FeedLayout: Story = {
	render: () => ({
		Component: AppShell,
		slot: `
			<div style="max-width: 600px; margin: 0 auto; padding: 1rem;">
				<div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem;">
					<h3 style="font-weight: 600; margin-bottom: 0.5rem;">Post 1</h3>
					<p style="color: var(--color-text-secondary);">This is a sample post in the feed.</p>
				</div>
				<div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem;">
					<h3 style="font-weight: 600; margin-bottom: 0.5rem;">Post 2</h3>
					<p style="color: var(--color-text-secondary);">Another post in the feed.</p>
				</div>
				<div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1.5rem;">
					<h3 style="font-weight: 600; margin-bottom: 0.5rem;">Post 3</h3>
					<p style="color: var(--color-text-secondary);">One more post.</p>
				</div>
			</div>
		`
	})
};

export const SettingsPage: Story = {
	render: () => ({
		Component: AppShell,
		slot: `
			<div style="max-width: 800px; margin: 0 auto; padding: 2rem;">
				<h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">Settings</h1>
				<div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem;">
					<h2 style="font-weight: 600; margin-bottom: 1rem;">Account Settings</h2>
					<p style="color: var(--color-text-secondary);">Manage your account preferences.</p>
				</div>
				<div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem;">
					<h2 style="font-weight: 600; margin-bottom: 1rem;">Privacy Settings</h2>
					<p style="color: var(--color-text-secondary);">Control your privacy options.</p>
				</div>
				<div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1.5rem;">
					<h2 style="font-weight: 600; margin-bottom: 1rem;">Notification Settings</h2>
					<p style="color: var(--color-text-secondary);">Manage notification preferences.</p>
				</div>
			</div>
		`
	})
};

export const ProductPage: Story = {
	render: () => ({
		Component: AppShell,
		slot: `
			<div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
					<div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 400px;">
						<p style="color: var(--color-text-secondary);">Product Images</p>
					</div>
					<div>
						<h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Vintage Leather Jacket</h1>
						<p style="font-size: 1.5rem; font-weight: 600; color: var(--color-primary); margin-bottom: 1rem;">$129.99</p>
						<p style="color: var(--color-text-secondary); margin-bottom: 2rem;">
							Beautiful vintage leather jacket in excellent condition. Classic style that never goes out of fashion.
						</p>
						<button style="width: 100%; padding: 0.75rem; background: #3b82f6; color: white; border-radius: 0.5rem; font-weight: 600;">
							Add to Cart
						</button>
					</div>
				</div>
			</div>
		`
	})
};
