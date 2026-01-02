import type { Meta, StoryObj } from '@storybook/svelte';
import PostCard from './PostCard.svelte';

const meta = {
	title: 'Components/Cards/PostCard',
	component: PostCard,
	tags: ['autodocs'],
	argTypes: {
		post: { control: 'object' }
	}
} satisfies Meta<PostCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const samplePost = {
	id: '1',
	content:
		"Just launched my new startup! Check out what we've been building for the past 6 months. Would love to get your feedback! 🚀",
	userId: 'user123',
	categoryId: 'cat1',
	createdAt: new Date('2024-01-15T10:30:00'),
	updatedAt: new Date('2024-01-15T10:30:00'),
	user: {
		id: 'user123',
		email: 'john.doe@example.com',
		username: 'johndoe',
		displayName: 'John Doe',
		avatarUrl: 'https://i.pravatar.cc/150?u=johndoe',
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2023-01-01')
	},
	category: {
		id: 'cat1',
		name: 'Technology',
		slug: 'technology',
		description: 'Tech discussions',
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2023-01-01')
	},
	images: [],
	_count: {
		likes: 24,
		comments: 8
	},
	isLiked: false
};

export const Default: Story = {
	args: {
		post: samplePost
	}
};

export const WithImages: Story = {
	args: {
		post: {
			...samplePost,
			images: [
				{
					id: '1',
					postId: '1',
					url: 'https://picsum.photos/600/400?random=1',
					order: 0,
					createdAt: new Date()
				},
				{
					id: '2',
					postId: '1',
					url: 'https://picsum.photos/600/400?random=2',
					order: 1,
					createdAt: new Date()
				},
				{
					id: '3',
					postId: '1',
					url: 'https://picsum.photos/600/400?random=3',
					order: 2,
					createdAt: new Date()
				}
			]
		}
	}
};

export const Liked: Story = {
	args: {
		post: {
			...samplePost,
			isLiked: true,
			_count: {
				likes: 25,
				comments: 8
			}
		}
	}
};

export const LongContent: Story = {
	args: {
		post: {
			...samplePost,
			content: `This is a much longer post with multiple paragraphs and lots of content to demonstrate how the card handles longer text. 

The Tunda Plug marketplace has been transforming how we think about sustainable fashion. By connecting buyers and sellers of second-hand clothing, we're not only reducing waste but also making quality fashion more accessible to everyone.

Here are some key features we've implemented:
• Advanced search and filtering
• Secure payment processing
• User verification system
• Real-time messaging
• Smart recommendations

What do you think? Would love to hear your thoughts on this approach to sustainable fashion! #sustainability #fashion #marketplace`
		}
	}
};

export const HighEngagement: Story = {
	args: {
		post: {
			...samplePost,
			_count: {
				likes: 1247,
				comments: 342
			},
			isLiked: true
		}
	}
};

export const WithSingleImage: Story = {
	args: {
		post: {
			...samplePost,
			content: 'Check out this amazing sunset! 🌅',
			images: [
				{
					id: '1',
					postId: '1',
					url: 'https://picsum.photos/600/400?random=5',
					order: 0,
					createdAt: new Date()
				}
			]
		}
	}
};

export const NoUserAvatar: Story = {
	args: {
		post: {
			...samplePost,
			user: {
				...samplePost.user,
				avatarUrl: null
			}
		}
	}
};

export const RecentPost: Story = {
	args: {
		post: {
			...samplePost,
			content: 'Just posted this a minute ago!',
			createdAt: new Date(),
			updatedAt: new Date(),
			_count: {
				likes: 0,
				comments: 0
			}
		}
	}
};

export const MultiplePosts: Story = {
	render: () => ({
		Component: PostCard,
		slot: `
			<div style="max-width: 600px; display: flex; flex-direction: column; gap: 1rem;">
				<PostCard post={${JSON.stringify({ ...samplePost, id: '1', content: 'First post in the feed' })}} />
				<PostCard post={${JSON.stringify({ ...samplePost, id: '2', content: 'Second post with an image', images: [{ id: '1', postId: '2', url: 'https://picsum.photos/600/400?random=6', order: 0, createdAt: new Date() }] })}} />
				<PostCard post={${JSON.stringify({ ...samplePost, id: '3', content: 'Third post that is liked', isLiked: true, _count: { likes: 45, comments: 12 } })}} />
			</div>
		`
	})
};
