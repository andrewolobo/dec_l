# User Service Implementation Documentation

**Implementation Date:** December 23, 2025  
**Status:** ✅ Complete  
**Files Created/Modified:**

- `apps/web/src/lib/services/user.service.ts` (Enhanced)
- `apps/web/src/lib/stores/user.store.ts` (New)
- `apps/web/src/lib/stores/index.ts` (Updated)
- `apps/web/src/lib/services/user.service.test.ts` (New)

---

## Overview

The User Service is a comprehensive implementation for managing user profiles, relationships, and preferences in the ReGoods application. It provides a complete solution for profile management, follow/unfollow functionality, block users, and user preferences, with integrated state management using Svelte stores.

### Key Features

✅ **Profile Management**

- Get and update current user profile
- View other users' profiles
- Profile picture management
- Email and phone verification tracking

✅ **Follow System**

- Follow/unfollow users with optimistic updates
- Get following and followers lists
- Automatic rollback on error
- Instant UI feedback

✅ **Block System**

- Block/unblock users
- Automatic unfollowing when blocking
- Optimistic updates with error recovery
- Blocked users list management

✅ **User Preferences**

- Notification preferences (email, push, SMS)
- Theme selection (light, dark, auto)
- Language preferences
- Granular notification controls

✅ **Statistics Tracking**

- Post counts by status
- Followers/following counts
- Automatic updates when actions occur

✅ **State Management**

- Centralized Svelte store
- Reactive data updates
- User caching for performance
- LocalStorage persistence

✅ **Search & Discovery**

- User search by name or email
- Results caching
- Pagination support

✅ **Advanced Features**

- User preloading for faster navigation
- Cache management utilities
- Force refresh option
- Optimistic updates throughout

---

## Architecture

### Service Layer (`user.service.ts`)

The service layer handles all API communication and coordinates with the store for state management.

**Key Functions:**

```typescript
// Profile Management
getProfile(): Promise<ApiResponse<UserProfileDTO>>
updateProfile(data: UpdateProfileDTO): Promise<ApiResponse<UserProfileDTO>>
getUserById(userId: number, forceRefresh?: boolean): Promise<ApiResponse<UserProfileDTO>>
changePassword(data: ChangePasswordDTO): Promise<ApiResponse<void>>
deleteAccount(): Promise<ApiResponse<void>>

// Profile Picture
updateProfilePicture(imageUrl: string): Promise<ApiResponse<UserProfileDTO>>
removeProfilePicture(): Promise<ApiResponse<UserProfileDTO>>

// Follow Operations
followUser(userId: number): Promise<ApiResponse<void>>
unfollowUser(userId: number): Promise<ApiResponse<void>>
toggleFollow(userId: number): Promise<ApiResponse<void>>
getFollowing(options?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<UserProfileDTO>>>
getFollowers(options?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<UserProfileDTO>>>
getUserFollowers(userId: number, options?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<UserProfileDTO>>>
getUserFollowing(userId: number, options?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<UserProfileDTO>>>

// Block Operations
blockUser(userId: number): Promise<ApiResponse<void>>
unblockUser(userId: number): Promise<ApiResponse<void>>
getBlockedUsers(): Promise<ApiResponse<UserProfileDTO[]>>

// User Preferences
getPreferences(): Promise<ApiResponse<PreferencesDTO>>
updatePreferences(preferences: Partial<PreferencesDTO>): Promise<ApiResponse<PreferencesDTO>>

// Statistics
getPostsSummary(): Promise<ApiResponse<UserPostsSummaryDTO>>

// Search & Discovery
searchUsers(query: string, options?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<UserProfileDTO>>>

// Cache Management
preloadUser(userId: number): Promise<void>
preloadUsers(userIds: number[]): Promise<void>
clearUserCache(): void
refreshProfile(): Promise<void>

// Helper Functions
getCachedUser(): UserProfileDTO | null
isEmailVerified(): boolean
isPhoneVerified(): boolean
getUserFullName(): string | null
getUserEmail(): string | null
getUserProfilePicture(): string | null
```

### Store Layer (`user.store.ts`)

The store provides centralized state management with reactive updates.

**Store Structure:**

```typescript
interface UserState {
  // Current user
  currentUser: UserProfileDTO | null;
  currentUserLoading: boolean;
  currentUserError: string | null;

  // User cache
  users: Record<number, UserProfileDTO>;
  userLoading: Record<number, boolean>;
  userError: Record<number, string | null>;

  // Follow relationships
  following: Set<number>;
  followers: Set<number>;
  followLoading: Record<number, boolean>;

  // Blocked users
  blockedUsers: Set<number>;
  blockLoading: Record<number, boolean>;

  // Statistics
  stats: {
    totalPosts: number;
    activePosts: number;
    expiredPosts: number;
    draftPosts: number;
    followersCount: number;
    followingCount: number;
  } | null;
  statsLoading: boolean;

  // Preferences
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    newMessageNotification: boolean;
    newFollowerNotification: boolean;
    postLikeNotification: boolean;
    language: string;
    theme: "light" | "dark" | "auto";
  } | null;
  preferencesLoading: boolean;

  // Profile update status
  isUpdating: boolean;
  updateError: string | null;
}
```

**Store Methods:**

```typescript
// Current User
setCurrentUser(user: UserProfileDTO | null)
updateCurrentUser(updates: Partial<UserProfileDTO>)
setCurrentUserLoading(loading: boolean)
setCurrentUserError(error: string | null)
clearCurrentUser()

// User Cache
setUser(user: UserProfileDTO)
setUserLoading(userId: number, loading: boolean)
setUserError(userId: number, error: string | null)
getUser(userId: number): UserProfileDTO | undefined
hasUser(userId: number): boolean

// Follow Management
setFollowing(userIds: number[])
addFollowing(userId: number)
removeFollowing(userId: number)
setFollowers(userIds: number[])
setFollowLoading(userId: number, loading: boolean)
isFollowing(userId: number): boolean
isFollower(userId: number): boolean

// Block Management
setBlockedUsers(userIds: number[])
blockUser(userId: number)
unblockUser(userId: number)
setBlockLoading(userId: number, loading: boolean)
isBlocked(userId: number): boolean

// Statistics
setStats(stats: UserState['stats'])
updateStats(updates: Partial<UserState['stats']>)
setStatsLoading(loading: boolean)
incrementPostCount(status: 'active' | 'draft' | 'expired')
decrementPostCount(status: 'active' | 'draft' | 'expired')

// Preferences
setPreferences(preferences: UserState['preferences'])
updatePreferences(updates: Partial<UserState['preferences']>)
setPreferencesLoading(loading: boolean)

// Profile Update
setUpdating(updating: boolean)
setUpdateError(error: string | null)

// Utility
reset()
getCurrentUserId(): number | null
isAuthenticated(): boolean
```

**Derived Stores:**

```typescript
import {
  currentUser,
  currentUserLoading,
  currentUserError,
  userStats,
  userPreferences,
  isAuthenticated,
  isEmailVerified,
  isPhoneVerified,
  following,
  followers,
  blockedUsers,
} from "$lib/stores/user.store";
```

---

## Usage Examples

### 1. Profile Management

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser, currentUserLoading } from '$lib/stores';
  import { getProfile, updateProfile } from '$lib/services';

  let editing = false;
  let formData = {
    fullName: '',
    bio: '',
    location: ''
  };

  onMount(async () => {
    if (!$currentUser) {
      await getProfile();
    }

    if ($currentUser) {
      formData = {
        fullName: $currentUser.fullName,
        bio: $currentUser.bio || '',
        location: $currentUser.location || ''
      };
    }
  });

  async function handleUpdate() {
    await updateProfile(formData);
    editing = false;
  }
</script>

{#if $currentUserLoading}
  <Spinner />
{:else if $currentUser}
  <div class="profile">
    <img src={$currentUser.profilePictureUrl} alt={$currentUser.fullName} />

    {#if editing}
      <form on:submit|preventDefault={handleUpdate}>
        <input bind:value={formData.fullName} />
        <textarea bind:value={formData.bio} />
        <input bind:value={formData.location} />
        <button type="submit">Save</button>
        <button type="button" on:click={() => editing = false}>Cancel</button>
      </form>
    {:else}
      <h1>{$currentUser.fullName}</h1>
      <p>{$currentUser.bio}</p>
      <p>{$currentUser.location}</p>
      <button on:click={() => editing = true}>Edit Profile</button>
    {/if}
  </div>
{/if}
```

### 2. Follow/Unfollow with Optimistic Updates

```svelte
<script lang="ts">
  import { following } from '$lib/stores';
  import { toggleFollow } from '$lib/services';

  export let userId: number;
  export let userName: string;

  $: isFollowing = $following.has(userId);

  async function handleFollowToggle() {
    await toggleFollow(userId);
  }
</script>

<div class="user-card">
  <h3>{userName}</h3>
  <button on:click={handleFollowToggle}>
    {isFollowing ? 'Unfollow' : 'Follow'}
  </button>
</div>
```

### 3. User Profile View

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { userStore, following, blockedUsers } from '$lib/stores';
  import { getUserById, toggleFollow, blockUser, unblockUser } from '$lib/services';

  export let userId: number;

  $: user = $userStore.users[userId];
  $: loading = $userStore.userLoading[userId];
  $: isFollowing = $following.has(userId);
  $: isBlocked = $blockedUsers.has(userId);

  onMount(async () => {
    if (!user) {
      await getUserById(userId);
    }
  });
</script>

{#if loading}
  <Spinner />
{:else if user}
  <div class="profile">
    <img src={user.profilePictureUrl} alt={user.fullName} />
    <h1>{user.fullName}</h1>
    <p>{user.bio}</p>

    <div class="actions">
      <button on:click={() => toggleFollow(userId)}>
        {isFollowing ? 'Unfollow' : 'Follow'}
      </button>

      <button on:click={() => isBlocked ? unblockUser(userId) : blockUser(userId)}>
        {isBlocked ? 'Unblock' : 'Block'}
      </button>
    </div>
  </div>
{/if}
```

### 4. User Statistics Dashboard

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { userStats } from '$lib/stores';
  import { getPostsSummary } from '$lib/services';

  onMount(() => {
    getPostsSummary();
  });
</script>

{#if $userStats}
  <div class="stats-dashboard">
    <div class="stat">
      <h3>Total Posts</h3>
      <p>{$userStats.totalPosts}</p>
    </div>

    <div class="stat">
      <h3>Active Posts</h3>
      <p>{$userStats.activePosts}</p>
    </div>

    <div class="stat">
      <h3>Drafts</h3>
      <p>{$userStats.draftPosts}</p>
    </div>

    <div class="stat">
      <h3>Followers</h3>
      <p>{$userStats.followersCount}</p>
    </div>

    <div class="stat">
      <h3>Following</h3>
      <p>{$userStats.followingCount}</p>
    </div>
  </div>
{/if}
```

### 5. User Preferences

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { userPreferences } from '$lib/stores';
  import { getPreferences, updatePreferences } from '$lib/services';

  onMount(() => {
    getPreferences();
  });

  async function handleToggle(key: string, value: boolean) {
    await updatePreferences({ [key]: value });
  }
</script>

{#if $userPreferences}
  <div class="preferences">
    <h2>Notification Preferences</h2>

    <label>
      <input
        type="checkbox"
        checked={$userPreferences.emailNotifications}
        on:change={(e) => handleToggle('emailNotifications', e.currentTarget.checked)}
      />
      Email Notifications
    </label>

    <label>
      <input
        type="checkbox"
        checked={$userPreferences.pushNotifications}
        on:change={(e) => handleToggle('pushNotifications', e.currentTarget.checked)}
      />
      Push Notifications
    </label>

    <label>
      <input
        type="checkbox"
        checked={$userPreferences.newFollowerNotification}
        on:change={(e) => handleToggle('newFollowerNotification', e.currentTarget.checked)}
      />
      New Follower Notifications
    </label>

    <h2>Appearance</h2>

    <select
      value={$userPreferences.theme}
      on:change={(e) => updatePreferences({ theme: e.currentTarget.value as 'light' | 'dark' | 'auto' })}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="auto">Auto</option>
    </select>
  </div>
{/if}
```

### 6. Following/Followers Lists

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getFollowing, getFollowers } from '$lib/services';

  let followingList: UserProfileDTO[] = [];
  let followersList: UserProfileDTO[] = [];
  let activeTab: 'following' | 'followers' = 'following';

  onMount(async () => {
    const [followingRes, followersRes] = await Promise.all([
      getFollowing(),
      getFollowers()
    ]);

    if (followingRes.success) {
      followingList = followingRes.data.data;
    }

    if (followersRes.success) {
      followersList = followersRes.data.data;
    }
  });
</script>

<div class="tabs">
  <button
    class:active={activeTab === 'following'}
    on:click={() => activeTab = 'following'}
  >
    Following ({followingList.length})
  </button>

  <button
    class:active={activeTab === 'followers'}
    on:click={() => activeTab = 'followers'}
  >
    Followers ({followersList.length})
  </button>
</div>

<div class="user-list">
  {#each activeTab === 'following' ? followingList : followersList as user (user.id)}
    <UserCard {user} />
  {/each}
</div>
```

### 7. User Search

```svelte
<script lang="ts">
  import { searchUsers } from '$lib/services';

  let query = '';
  let searchResults: UserProfileDTO[] = [];
  let searching = false;

  async function handleSearch() {
    if (!query.trim()) return;

    searching = true;
    const result = await searchUsers(query);

    if (result.success) {
      searchResults = result.data.data;
    }

    searching = false;
  }
</script>

<div class="search">
  <input
    bind:value={query}
    on:keydown={(e) => e.key === 'Enter' && handleSearch()}
    placeholder="Search users..."
  />
  <button on:click={handleSearch}>Search</button>
</div>

{#if searching}
  <Spinner />
{:else if searchResults.length > 0}
  <div class="results">
    {#each searchResults as user (user.id)}
      <a href="/users/{user.id}">
        <img src={user.profilePictureUrl} alt={user.fullName} />
        <div>
          <h3>{user.fullName}</h3>
          <p>{user.location}</p>
        </div>
      </a>
    {/each}
  </div>
{/if}
```

---

## Testing

The User Service includes comprehensive test coverage covering:

- ✅ Profile management (get, update, view others)
- ✅ Follow/unfollow with optimistic updates
- ✅ Block/unblock functionality
- ✅ User preferences management
- ✅ Statistics tracking
- ✅ Search functionality
- ✅ Store synchronization
- ✅ Error handling and rollback
- ✅ Cache management
- ✅ Helper functions

**Run Tests:**

```bash
cd apps/web
npm test user.service.test.ts
```

---

## Performance Optimizations

### 1. Caching

- User profiles are cached to avoid redundant API calls
- Cache checked before making API requests
- Force refresh available when needed

### 2. Optimistic Updates

- Follow/unfollow updates UI immediately
- Block/unblock updates UI immediately
- Automatic rollback on error
- No delay waiting for server response

### 3. LocalStorage Persistence

- Current user persisted to localStorage
- Survives page reloads
- Automatic sync with store

### 4. Preloading

- Preload users before navigation
- Batch preload multiple users
- Silent failures don't impact UX

### 5. Store Efficiency

- Updates only affected parts of state
- Derived stores for reactive subscriptions
- Minimal re-renders

---

## API Endpoints Used

```
GET    /api/v1/users/profile                 - Get current user profile
PUT    /api/v1/users/profile                 - Update profile
POST   /api/v1/users/change-password         - Change password
DELETE /api/v1/users/account                 - Delete account

GET    /api/v1/users/:id                     - Get user by ID
POST   /api/v1/users/:id/follow              - Follow user
DELETE /api/v1/users/:id/follow              - Unfollow user
GET    /api/v1/users/following               - Get following list
GET    /api/v1/users/followers               - Get followers list
GET    /api/v1/users/:id/followers           - Get user's followers
GET    /api/v1/users/:id/following           - Get user's following

POST   /api/v1/users/:id/block               - Block user
DELETE /api/v1/users/:id/block               - Unblock user
GET    /api/v1/users/blocked                 - Get blocked users list

GET    /api/v1/users/preferences             - Get user preferences
PUT    /api/v1/users/preferences             - Update preferences

GET    /api/v1/users/posts-summary           - Get posts summary
GET    /api/v1/users/search                  - Search users

POST   /api/v1/users/request-email-verification    - Request email verification
POST   /api/v1/users/request-phone-verification    - Request phone verification
```

---

## Future Enhancements

### Potential Additions

1. **Real-time Updates**
   - WebSocket for live follow notifications
   - Real-time follower count updates
   - Live presence indicators

2. **Advanced Features**
   - Mutual follow detection
   - Suggested users to follow
   - User badges and achievements
   - Reputation system

3. **Privacy Controls**
   - Private profile option
   - Follower approval system
   - Hide online status

4. **Analytics**
   - Profile view tracking
   - Engagement metrics
   - Growth analytics

---

## Dependencies

- **Svelte/Store**: State management
- **Axios**: HTTP client (via api.client)
- **Type System**: Full TypeScript support

---

## Related Files

- [user.types.ts](../apps/web/src/lib/types/user.types.ts) - Type definitions
- [api.types.ts](../apps/web/src/lib/types/api.types.ts) - API response types
- [error-handler.ts](../apps/web/src/lib/utils/error-handler.ts) - Error handling
- [api.client.ts](../apps/web/src/lib/services/api.client.ts) - HTTP client
- [auth.service.ts](../apps/web/src/lib/services/auth.service.ts) - Authentication

---

## Conclusion

The User Service is a production-ready implementation with comprehensive features, excellent test coverage, and performance optimizations. It provides a solid foundation for the ReGoods application's user management and social features.

**Implementation Time:** ~2 hours  
**Lines of Code:** ~900 (service + store + tests)  
**Test Coverage:** Comprehensive (all major paths covered)  
**Status:** ✅ Ready for Production
