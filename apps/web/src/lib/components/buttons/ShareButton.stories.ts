import type { Meta, StoryObj } from '@storybook/svelte';
import ShareButton from './ShareButton.svelte';

const meta = {
	title: 'Components/Buttons/ShareButton',
	component: ShareButton,
	tags: ['autodocs'],
	argTypes: {
		url: {
			control: 'text',
			description: 'URL to share'
		},
		title: {
			control: 'text',
			description: 'Title to share'
		},
		text: {
			control: 'text',
			description: 'Description text'
		}
	}
} satisfies Meta<ShareButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		url: 'https://tundaplug.com/post/123',
		title: 'iPhone 12 Pro Max',
		text: 'Check out this amazing deal!'
	}
};

export const WithCustomText: Story = {
	args: {
		url: 'https://tundaplug.com/post/456',
		title: 'Vintage Camera',
		text: 'Rare find! Vintage Nikon F3 in excellent condition.'
	}
};

export const MinimalInfo: Story = {
	args: {
		url: 'https://tundaplug.com/post/789'
	}
};
