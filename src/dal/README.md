# Data Access Layer (DAL)

## Overview

This DAL provides a clean abstraction layer between the application logic and the database using Prisma ORM.

## Structure

```
src/dal/
 prisma.client.ts          # Prisma singleton instance
 repositories/              # Repository pattern implementations
     base.repository.ts     # Base class with common CRUD operations
     user.repository.ts     # User data access
     post.repository.ts     # Post data access
     like.repository.ts     # Like data access
     category.repository.ts # Category data access
     payment.repository.ts  # Payment data access
     view.repository.ts     # View analytics data access
     index.ts               # Export all repositories
```

## Usage

### Import Repositories

```typescript
import { 
  userRepository, 
  postRepository, 
  categoryRepository 
} from './dal/repositories';
```

### User Repository Examples

```typescript
// Find user by email
const user = await userRepository.findByEmail('user@example.com');

// Create OAuth user
const newUser = await userRepository.createOAuthUser({
  email: 'user@example.com',
  phoneNumber: '+256123456789',
  fullName: 'John Doe',
  oauthProvider: 'google',
  oauthProviderId: 'google-id-123',
});

// Update user profile
await userRepository.updateProfile(userId, {
  fullName: 'John Updated',
  location: 'Kampala',
});
```

### Post Repository Examples

```typescript
// Get feed
const posts = await postRepository.getFeed({
  limit: 20,
  offset: 0,
  categoryId: 1,
});

// Create post
const post = await postRepository.createPost({
  userId: 1,
  title: 'Used Laptop',
  categoryId: 1,
  description: 'Dell Laptop in good condition',
  price: 500000,
  location: 'Kampala',
  contactNumber: '+256123456789',
  images: [
    { imageUrl: 'https://...', displayOrder: 0 },
  ],
});

// Approve post
await postRepository.approvePost(postId);

// Search posts
const results = await postRepository.searchPosts('laptop', 10);
```

### Like Repository Examples

```typescript
// Like a post
await likeRepository.likePost(userId, postId);

// Unlike a post
await likeRepository.unlikePost(userId, postId);

// Check if user liked post
const hasLiked = await likeRepository.hasUserLiked(userId, postId);

// Get post likes
const likes = await likeRepository.getPostLikes(postId);
```

### Category Repository Examples

```typescript
// Get all categories
const categories = await categoryRepository.getAllCategories();

// Get categories with post count
const categoriesWithCount = await categoryRepository.getCategoriesWithCount();
```

### Payment Repository Examples

```typescript
// Create payment
const payment = await paymentRepository.createPayment({
  postId: 1,
  userId: 1,
  amount: 5000,
  paymentMethod: 'MobileMoney',
  transactionReference: 'TXN123456',
});

// Confirm payment
await paymentRepository.confirmPayment(paymentId);

// Get pending payments
const pending = await paymentRepository.getPendingPayments();
```

### View Repository Examples

```typescript
// Record a view
await viewRepository.recordView({
  postId: 1,
  userId: 1,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  sessionId: 'session-123',
});

// Get trending posts
const trending = await viewRepository.getTrendingPosts(10, 24);

// Get view count
const count = await viewRepository.getPostViewCount(postId);
```

## Base Repository

All repositories extend `BaseRepository` which provides:

- `findById(id, include?)` - Find record by ID
- `findAll(options?)` - Find all records with filters
- `findOne(where, include?)` - Find single record
- `create(data)` - Create new record
- `update(id, data)` - Update record
- `delete(id)` - Delete record
- `count(where?)` - Count records
- `exists(where)` - Check if record exists
- `transaction(callback)` - Execute transaction

## Transactions

Use transactions for operations that must succeed or fail together:

```typescript
const result = await userRepository.transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const post = await tx.post.create({ data: { ...postData, userId: user.id } });
  return { user, post };
});
```

## Best Practices

1. **Use repository methods** instead of direct Prisma calls in business logic
2. **Add new methods** to repositories when needed instead of writing complex queries in services
3. **Keep repositories focused** on data access only
4. **Use transactions** for multi-step operations
5. **Add proper error handling** in services that use repositories

## Type Safety

All repositories are fully type-safe thanks to Prisma's generated types:

```typescript
import { User, Post, Category } from '@prisma/client';

// Return types are automatically inferred
const user: User = await userRepository.findById(1);
const posts: Post[] = await postRepository.getFeed({ limit: 10 });
```
