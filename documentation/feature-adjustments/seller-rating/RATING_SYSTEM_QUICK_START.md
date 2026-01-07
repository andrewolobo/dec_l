# Seller Rating System - Quick Integration Guide

## 🚀 Quick Start

The seller rating system is now fully implemented across all 7 phases and ready for use. This guide shows you how to integrate rating features into your pages.

---

## 📦 What's Available

### Components (Phase 5)
- `StarRating.svelte` - Interactive star input/display
- `RatingModal.svelte` - Create/edit rating form
- `SellerRatingDisplay.svelte` - Compact rating badge
- `RatingList.svelte` - Paginated rating list
- `RatingDistribution.svelte` - Rating breakdown chart

### Services (Phase 5)
- `rating.service.ts` - API integration functions
- 9 functions: create, update, delete, get scores, check eligibility

### Pages (Phase 7)
- `/profile` - Own profile with ratings
- `/profile/[id]` - Public seller profiles with rating ability

---

## 💡 Common Use Cases

### 1. Display Seller Rating Badge

**Where:** Product cards, seller lists, search results

```svelte
<script>
  import SellerRatingDisplay from '$lib/components/common/SellerRatingDisplay.svelte';
</script>

<SellerRatingDisplay
  sellerId={post.userId}
  averageRating={post.user.sellerRating}
  totalRatings={post.user.totalRatings}
  showDetails={true}
  onclick={() => goto(`/profile/${post.userId}`)}
/>
```

**Props:**
- `sellerId` - User ID (required)
- `averageRating` - 0-5 score (required)
- `totalRatings` - Count (required)
- `showDetails` - Show percentage (optional)
- `onclick` - Click handler (optional)

---

### 2. Show Rating Stars

**Where:** Rating displays, reviews, feedback forms

```svelte
<script>
  import StarRating from '$lib/components/common/StarRating.svelte';
</script>

<!-- Display mode (read-only) -->
<StarRating
  value={4.5}
  mode="display"
  size="md"
/>

<!-- Interactive mode (user input) -->
<StarRating
  bind:value={selectedRating}
  mode="interactive"
  size="lg"
  onchange={(rating) => console.log('Selected:', rating)}
/>
```

**Props:**
- `value` - Rating value 0-5 (bindable)
- `mode` - "display" | "interactive"
- `size` - "sm" | "md" | "lg"
- `onchange` - Callback when value changes

---

### 3. Open Rating Modal

**Where:** After purchase, transaction complete, post details

```svelte
<script>
  import RatingModal from '$lib/components/overlay/RatingModal.svelte';
  import Button from '$lib/components/buttons/Button.svelte';
  
  let showModal = $state(false);
  
  function handleSuccess() {
    showModal = false;
    // Reload ratings or show success message
  }
</script>

<Button onclick={() => showModal = true}>
  Rate Seller
</Button>

{#if showModal}
  <RatingModal
    sellerId={seller.id}
    sellerName={seller.fullName}
    postId={post.id}
    onClose={() => showModal = false}
    onSuccess={handleSuccess}
  />
{/if}
```

**Props:**
- `sellerId` - Seller user ID (required)
- `sellerName` - Display name (required)
- `postId` - Related post ID (optional)
- `existingRating` - For edit mode (optional)
- `onClose` - Close callback (required)
- `onSuccess` - Success callback (required)

---

### 4. Display Rating List

**Where:** Profile pages, seller reviews section

```svelte
<script>
  import RatingList from '$lib/components/common/RatingList.svelte';
</script>

<RatingList
  sellerId={seller.id}
  showEdit={isOwnProfile}
  initialLimit={10}
  minRating={4}
/>
```

**Props:**
- `sellerId` - Seller user ID (required)
- `showEdit` - Show edit/delete buttons (optional)
- `initialLimit` - Initial load count (default: 10)
- `minRating` - Filter by minimum stars (optional)

**Features:**
- Infinite scroll pagination
- Edit/delete for own ratings
- Loading states
- Empty state handling

---

### 5. Show Rating Distribution

**Where:** Profile pages, analytics dashboards

```svelte
<script>
  import RatingDistribution from '$lib/components/common/RatingDistribution.svelte';
</script>

<RatingDistribution
  sellerId={seller.id}
  showPercentages={true}
/>
```

**Props:**
- `sellerId` - Seller user ID (required)
- `showPercentages` - Display percentage labels (default: true)

**Displays:**
- Horizontal bars for 1-5 stars
- Count and percentage for each level
- Color-coded (green to red)
- Animated on load

---

## 🔧 API Service Functions

### Get Seller Score

```typescript
import * as ratingService from '$lib/services/rating.service';

const result = await ratingService.getSellerScore(sellerId);
if (result.success) {
  console.log('Average:', result.data.averageRating);
  console.log('Total:', result.data.totalRatings);
  console.log('Display:', result.data.displayText); // "4.8 ★" or "New Seller"
}
```

### Check Rating Eligibility

```typescript
const result = await ratingService.canUserRateSeller(sellerId);
if (result.success && result.data.canRate) {
  // Show "Rate Seller" button
} else if (result.data.alreadyRated) {
  // Show "Edit Rating" button
}
```

### Create Rating

```typescript
const result = await ratingService.createRating({
  sellerId: 123,
  postId: 456, // optional
  rating: 5,
  comment: 'Excellent seller!'
});

if (result.success) {
  console.log('Rating created:', result.data);
}
```

### Update Rating

```typescript
const result = await ratingService.updateRating(ratingId, {
  rating: 4,
  comment: 'Updated review'
});
```

### Delete Rating

```typescript
const result = await ratingService.deleteRating(ratingId);
```

### Get Rating Distribution

```typescript
const result = await ratingService.getRatingDistribution(sellerId);
// Returns: { 1: {count, percentage}, 2: {...}, ... }
```

---

## 🎨 Styling & Theming

### Dark Mode Support
All components automatically adapt to dark mode using Tailwind's `dark:` classes.

### Custom Colors
Rating colors follow this scheme:
```typescript
// In getRatingColorClass() helper
4.5-5.0: 'text-green-600'      // Excellent
4.0-4.4: 'text-lime-600'       // Very Good
3.5-3.9: 'text-yellow-600'     // Good
3.0-3.4: 'text-orange-600'     // Fair
< 3.0:   'text-red-600'        // Poor
```

### Icon System
Uses Material Symbols icons via the `Icon` component:
- `star` - Filled star
- `star_half` - Half star
- `star_outline` - Empty star
- `edit` - Edit button
- `delete` - Delete button

---

## 🔗 Existing Integrations

### Post Details Page
**Location:** `apps/web/src/routes/post/[id]/+page.svelte`

**Add rating badge to seller info:**
```svelte
<div class="seller-info">
  <Avatar src={post.user.profilePictureUrl} />
  <div>
    <h3>{post.user.fullName}</h3>
    <SellerRatingDisplay
      sellerId={post.user.id}
      averageRating={post.user.sellerRating}
      totalRatings={post.user.totalRatings}
    />
  </div>
</div>
```

### Browse Page
**Location:** `apps/web/src/routes/browse/+page.svelte`

**Add rating to post cards:**
```svelte
{#each posts as post}
  <PostCard {post}>
    <SellerRatingDisplay
      sellerId={post.userId}
      averageRating={post.user.sellerRating}
      totalRatings={post.user.totalRatings}
      showDetails={false}
    />
  </PostCard>
{/each}
```

### Messages Page
**Location:** `apps/web/src/routes/messages/[userId]/+page.svelte`

**Add "Rate Seller" button after transaction:**
```svelte
<Button onclick={() => showRatingModal = true}>
  Rate {otherUser.fullName}
</Button>

{#if showRatingModal}
  <RatingModal
    sellerId={otherUser.id}
    sellerName={otherUser.fullName}
    onClose={() => showRatingModal = false}
    onSuccess={handleRatingSubmit}
  />
{/if}
```

---

## ⚡ Performance Tips

### 1. Lazy Load Components
```svelte
<script>
  import { onMount } from 'svelte';
  
  let RatingDistribution;
  
  onMount(async () => {
    const module = await import('$lib/components/common/RatingDistribution.svelte');
    RatingDistribution = module.default;
  });
</script>

{#if RatingDistribution}
  <svelte:component this={RatingDistribution} sellerId={seller.id} />
{/if}
```

### 2. Cache Seller Scores
```typescript
const scoreCache = new Map();

async function getCachedScore(sellerId: number) {
  if (scoreCache.has(sellerId)) {
    return scoreCache.get(sellerId);
  }
  
  const result = await ratingService.getSellerScore(sellerId);
  scoreCache.set(sellerId, result.data);
  
  // Clear cache after 5 minutes
  setTimeout(() => scoreCache.delete(sellerId), 5 * 60 * 1000);
  
  return result.data;
}
```

### 3. Pagination
RatingList component automatically handles pagination with "Load More" button. Initial limit default is 10 items.

---

## 🐛 Troubleshooting

### Rating Not Showing
**Check:**
1. User has `sellerRating`, `totalRatings` fields in database
2. API endpoint `/api/v1/ratings/seller/:id/score` is accessible
3. User ID is valid and exists

### Can't Rate Seller
**Requirements:**
1. User must be authenticated
2. Cannot rate yourself
3. Must have message exchange with seller
4. Cannot rate same seller twice (per post if postId provided)

### Edit Button Not Showing
**Check:**
1. Rating belongs to current user (`raterId === currentUser.id`)
2. `showEdit={true}` prop is set on RatingList
3. User is authenticated

---

## 📚 Complete Example

### Full Profile Integration

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Avatar from '$lib/components/media/Avatar.svelte';
  import Button from '$lib/components/buttons/Button.svelte';
  import SellerRatingDisplay from '$lib/components/common/SellerRatingDisplay.svelte';
  import RatingList from '$lib/components/common/RatingList.svelte';
  import RatingDistribution from '$lib/components/common/RatingDistribution.svelte';
  import RatingModal from '$lib/components/overlay/RatingModal.svelte';
  import * as ratingService from '$lib/services/rating.service';
  import { currentUser } from '$lib/stores';

  const sellerId = $derived(parseInt($page.params.id));
  const isOwnProfile = $derived($currentUser?.id === sellerId);

  let seller = $state(null);
  let stats = $state({ rating: 0, totalRatings: 0 });
  let canRate = $state(false);
  let showModal = $state(false);

  async function loadData() {
    // Load seller profile
    const userResponse = await fetch(`/api/v1/users/${sellerId}`);
    seller = (await userResponse.json()).data;

    // Load ratings
    const scoreResult = await ratingService.getSellerScore(sellerId);
    if (scoreResult.success) {
      stats = scoreResult.data;
    }

    // Check eligibility
    if (!isOwnProfile) {
      const eligibility = await ratingService.canUserRateSeller(sellerId);
      canRate = eligibility.data?.canRate || false;
    }
  }

  onMount(loadData);
</script>

<!-- Profile Header -->
<div class="profile-header">
  <Avatar src={seller?.profilePictureUrl} size="xl" />
  <h1>{seller?.fullName}</h1>
  
  <SellerRatingDisplay
    {sellerId}
    averageRating={stats.rating}
    totalRatings={stats.totalRatings}
  />

  {#if canRate}
    <Button onclick={() => showModal = true}>
      Rate Seller
    </Button>
  {/if}
</div>

<!-- Ratings Section -->
<div class="ratings-section">
  <h2>Rating Breakdown</h2>
  <RatingDistribution {sellerId} />

  <h2>Customer Reviews</h2>
  <RatingList {sellerId} showEdit={isOwnProfile} />
</div>

<!-- Rating Modal -->
{#if showModal}
  <RatingModal
    {sellerId}
    sellerName={seller.fullName}
    onClose={() => showModal = false}
    onSuccess={() => {
      showModal = false;
      loadData(); // Reload ratings
    }}
  />
{/if}
```

---

## 🎯 Best Practices

1. **Always check authentication** before showing rating features
2. **Use loading states** while fetching data
3. **Handle empty states** gracefully ("No ratings yet")
4. **Reload data** after successful rating submission
5. **Show error messages** if API calls fail
6. **Cache scores** for frequently viewed profiles
7. **Lazy load** heavy components (distribution, lists)
8. **Debounce searches** if implementing rating search/filter

---

## 📞 Need Help?

- **Documentation:** `/documentation/PHASE_7_IMPLEMENTATION_COMPLETE.md`
- **Component Examples:** `/documentation/RATING_SYSTEM_INTEGRATION_EXAMPLES.md`
- **API Reference:** Phase 4 documentation
- **Test Examples:** `/apps/web/src/__tests__/e2e/rating-flow.spec.ts`

---

**Quick Reference Card:**
```
├─ Components: $lib/components/common/
│  ├─ StarRating.svelte
│  ├─ RatingModal.svelte
│  ├─ SellerRatingDisplay.svelte
│  ├─ RatingList.svelte
│  └─ RatingDistribution.svelte
│
├─ Services: $lib/services/rating.service.ts
│  ├─ getSellerScore()
│  ├─ canUserRateSeller()
│  ├─ createRating()
│  ├─ updateRating()
│  └─ deleteRating()
│
└─ Pages: src/routes/profile/
   ├─ +page.svelte (own profile)
   └─ [id]/+page.svelte (public profile)
```

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Production Ready ✅
