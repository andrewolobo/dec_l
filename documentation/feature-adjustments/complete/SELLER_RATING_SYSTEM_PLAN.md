# Seller Rating System Implementation Plan

**Status:** Planning  
**Date:** January 6, 2026  
**Feature:** User-to-User Seller Rating System

---

## Overview

Implementation of a 5-point rating system that allows users to rate sellers based on their transaction experiences. The seller's overall score is calculated as: **positive ratings (≥4 stars) / total ratings**.

### Key Objectives

- Enable buyers to rate sellers after completed transactions
- Track individual ratings with audit trail
- Display aggregate seller scores on profiles and listings
- Prevent duplicate ratings and ensure rating integrity
- Support optional text reviews alongside numeric ratings

---

## Current State Analysis

### Existing Schema Structure

**No rating system currently exists.** The application has:

- ✅ Like system for posts
- ✅ View tracking for engagement
- ✅ Message system for buyer-seller communication
- ✅ Payment tracking for transactions
- ❌ No seller ratings
- ❌ No review mechanism

**Frontend:** Profile page already displays a hardcoded rating (`stats.rating = 4.8`) - UI is ready for real data.

---

## Proposed Schema Changes

### 1. New `SellerRating` Model

Add to `apps/api/prisma/schema.prisma`:

```prisma
model SellerRating {
  id        Int      @id @default(autoincrement()) @map("RatingID")
  sellerId  Int      @map("SellerID")
  raterId   Int      @map("RaterID")
  postId    Int?     @map("PostID")
  rating    Int      @map("Rating") // 1-5 scale
  comment   String?  @db.Text @map("Comment")
  createdAt DateTime @default(now()) @map("CreatedAt")
  updatedAt DateTime @updatedAt @map("UpdatedAt")

  // Relations (implicit - no FK constraints in DB)
  seller    User     @relation("RatingsReceived", fields: [sellerId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  rater     User     @relation("RatingsGiven", fields: [raterId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  post      Post?    @relation(fields: [postId], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@unique([sellerId, raterId, postId], map: "UQ_SellerRatings_Seller_Rater_Post")
  @@index([sellerId], map: "IX_SellerRatings_SellerID")
  @@index([raterId], map: "IX_SellerRatings_RaterID")
  @@index([postId], map: "IX_SellerRatings_PostID")
  @@map("SellerRatings")
}
```

**Database Compatibility Notes:**

- `createdAt` and `updatedAt` fields use generic `DateTime` type without `@db.Timestamp` annotation
- This ensures compatibility with both PostgreSQL (TIMESTAMPTZ) and SQL Server (DATETIME2)
- Prisma automatically maps to the appropriate native type based on the configured database provider

**Design Decisions:**

- `postId` is optional to allow general seller ratings (not tied to specific transaction)
- Unique constraint on `[sellerId, raterId, postId]` prevents duplicate ratings per transaction
- `comment` is optional for text reviews
- Follows existing schema patterns (naming, indexes, relationships)

### 2. Extend `User` Model

Add aggregate fields for performance:

```prisma
model User {
  // ... existing fields

  // Rating aggregate fields (denormalized for performance)
  sellerRating     Decimal?  @default(0) @db.Decimal(3, 2) @map("SellerRating")
  totalRatings     Int       @default(0) @map("TotalRatings")
  positiveRatings  Int       @default(0) @map("PositiveRatings")

  // Rating relations
  ratingsReceived  SellerRating[] @relation("RatingsReceived")
  ratingsGiven     SellerRating[] @relation("RatingsGiven")

  // ... existing relations
}
```

**Database Compatibility Notes:**

- `Decimal(3, 2)` is supported by both PostgreSQL (NUMERIC/DECIMAL) and SQL Server (DECIMAL)
- Allows values like 0.00 to 5.00 (perfect for star ratings)
- Default value of 0 ensures no NULL handling needed for new users

**Benefits:**

- Fast score retrieval without aggregation queries
- Supports sorting/filtering users by rating
- Minimal read latency for high-traffic pages

### 3. Extend `Post` Model

Add relation to ratings:

```prisma
model Post {
  // ... existing fields

  ratings  SellerRating[]

  // ... existing relations
}
```

---

## Implementation Steps

### Phase 1: Database Migration

#### Step 1a: Prisma Migration (Recommended)

```bash
cd apps/api
npx prisma migrate dev --name add_seller_rating_system
```

This will automatically generate SQL for your configured database provider.

#### Step 1b: Manual Migration Scripts (Alternative)

If you need to run migrations manually or support multiple database types:

**For PostgreSQL:**

```sql
-- Create SellerRatings table
CREATE TABLE "SellerRatings" (
    "RatingID" SERIAL NOT NULL,
    "SellerID" INTEGER NOT NULL,
    "RaterID" INTEGER NOT NULL,
    "PostID" INTEGER,
    "Rating" INTEGER NOT NULL,
    "Comment" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SellerRatings_pkey" PRIMARY KEY ("RatingID")
);

-- Create unique constraint
CREATE UNIQUE INDEX "UQ_SellerRatings_Seller_Rater_Post" ON "SellerRatings"("SellerID", "RaterID", "PostID");

-- Create indexes for performance
CREATE INDEX "IX_SellerRatings_SellerID" ON "SellerRatings"("SellerID");
CREATE INDEX "IX_SellerRatings_RaterID" ON "SellerRatings"("RaterID");
CREATE INDEX "IX_SellerRatings_PostID" ON "SellerRatings"("PostID");

-- Add rating aggregate columns to Users table
ALTER TABLE "Users" ADD COLUMN "SellerRating" DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE "Users" ADD COLUMN "TotalRatings" INTEGER DEFAULT 0;
ALTER TABLE "Users" ADD COLUMN "PositiveRatings" INTEGER DEFAULT 0;
```

**For SQL Server:**

```sql
-- Create SellerRatings table
CREATE TABLE [SellerRatings] (
    [RatingID] INT IDENTITY(1,1) NOT NULL,
    [SellerID] INT NOT NULL,
    [RaterID] INT NOT NULL,
    [PostID] INT NULL,
    [Rating] INT NOT NULL,
    [Comment] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] DATETIME2 NOT NULL,

    CONSTRAINT [PK_SellerRatings] PRIMARY KEY ([RatingID])
);
GO

-- Create unique constraint
CREATE UNIQUE NONCLUSTERED INDEX [UQ_SellerRatings_Seller_Rater_Post]
ON [SellerRatings]([SellerID], [RaterID], [PostID]);
GO

-- Create indexes for performance
CREATE NONCLUSTERED INDEX [IX_SellerRatings_SellerID] ON [SellerRatings]([SellerID]);
CREATE NONCLUSTERED INDEX [IX_SellerRatings_RaterID] ON [SellerRatings]([RaterID]);
CREATE NONCLUSTERED INDEX [IX_SellerRatings_PostID] ON [SellerRatings]([PostID]);
GO

-- Add rating aggregate columns to Users table
ALTER TABLE [Users] ADD [SellerRating] DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE [Users] ADD [TotalRatings] INT DEFAULT 0;
ALTER TABLE [Users] ADD [PositiveRatings] INT DEFAULT 0;
GO
```

**Migration Verification:**

```bash
# Check migration status
npx prisma migrate status

# Generate Prisma Client
npx prisma generate

# Verify schema
npx prisma db pull
```

**Tasks:**

1. ✅ Add `SellerRating` table with proper column types for target database
2. ✅ Add rating aggregate columns to `Users` table
3. ✅ Create indexes for query performance
4. ✅ Generate Prisma client
5. ✅ Verify migration in development database
6. ✅ Test on both PostgreSQL and SQL Server (if applicable)

### Phase 2: Data Access Layer

**Create:** `apps/api/src/dal/repositories/sellerrating.repository.ts`

```typescript
import { BaseRepository } from "./base.repository";
import { SellerRating, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

/**
 * SellerRating Repository
 * Handles all database operations for seller ratings
 */
export class SellerRatingRepository extends BaseRepository<SellerRating> {
  protected modelName: Prisma.ModelName = "SellerRating";

  /**
   * Create a new rating
   */
  async createRating(data: {
    sellerId: number;
    raterId: number;
    postId?: number;
    rating: number;
    comment?: string;
  }): Promise<SellerRating> {
    return this.create(data);
  }

  /**
   * Get all ratings for a seller with rater and post details
   */
  async getRatingsByUser(sellerId: number, limit: number = 10): Promise<any[]> {
    return this.findAll({
      where: { sellerId },
      include: {
        rater: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Calculate aggregate seller scores
   * Compatible with both PostgreSQL and SQL Server
   */
  async calculateSellerScore(sellerId: number): Promise<{
    averageRating: number;
    totalRatings: number;
    positiveRatings: number;
  }> {
    const result = await prisma.sellerRating.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const positiveCount = await prisma.sellerRating.count({
      where: { sellerId, rating: { gte: 4 } },
    });

    return {
      averageRating: result._avg.rating || 0,
      totalRatings: result._count.id,
      positiveRatings: positiveCount,
    };
  }

  /**
   * Check if a user has already rated a specific post
   */
  async hasUserRatedPost(raterId: number, postId: number): Promise<boolean> {
    const rating = await this.findOne({ raterId, postId });
    return !!rating;
  }

  /**
   * Get rating by seller, rater, and post combination
   */
  async findRating(
    sellerId: number,
    raterId: number,
    postId?: number
  ): Promise<SellerRating | null> {
    return this.findOne({ sellerId, raterId, postId });
  }
}
```

**Update:** `apps/api/src/dal/repositories/index.ts`

Add the new repository export:

```typescript
// ... existing exports
export { SellerRatingRepository } from "./sellerrating.repository";

// Add to singleton instances
export const sellerRatingRepository = new SellerRatingRepository();
```

### Phase 3: Service Layer

**Create:** `apps/api/src/services/RatingService.ts`

```typescript
import { SellerRatingRepository } from "../dal/repositories/sellerrating.repository";
import { UserRepository } from "../dal/repositories/user.repository";
import { MessageRepository } from "../dal/repositories/message.repository";
import { ValidationError, NotFoundError, ForbiddenError } from "../errors";

export class RatingService {
  private ratingRepo: SellerRatingRepository;
  private userRepo: UserRepository;
  private messageRepo: MessageRepository;

  constructor() {
    this.ratingRepo = new SellerRatingRepository();
    this.userRepo = new UserRepository();
    this.messageRepo = new MessageRepository();
  }

  async createRating(data: {
    sellerId: number;
    raterId: number;
    postId?: number;
    rating: number;
    comment?: string;
  }) {
    // Validation
    if (data.rating < 1 || data.rating > 5) {
      throw new ValidationError("Rating must be between 1 and 5");
    }

    if (data.sellerId === data.raterId) {
      throw new ForbiddenError("Cannot rate yourself");
    }

    // Check if seller exists
    const seller = await this.userRepo.findById(data.sellerId);
    if (!seller) {
      throw new NotFoundError("Seller not found");
    }

    // Check for duplicate rating
    if (data.postId) {
      const existingRating = await this.ratingRepo.hasUserRatedPost(
        data.raterId,
        data.postId
      );
      if (existingRating) {
        throw new ValidationError(
          "You have already rated this seller for this post"
        );
      }
    }

    // Verify message exchange between buyer and seller
    const hasInteraction = await this.messageRepo.findOne({
      OR: [
        { senderId: data.raterId, recipientId: data.sellerId },
        { senderId: data.sellerId, recipientId: data.raterId },
      ],
      isDeleted: false,
    });

    if (!hasInteraction) {
      throw new ForbiddenError("Can only rate seller after message exchange");
    }

    // Create rating
    const rating = await this.ratingRepo.createRating(data);

    // Update seller aggregate scores
    await this.updateSellerAggregates(data.sellerId);

    return rating;
  }

  async getSellerRatings(sellerId: number, limit: number = 10) {
    return this.ratingRepo.getRatingsByUser(sellerId, limit);
  }

  async getSellerScore(sellerId: number) {
    const scores = await this.ratingRepo.calculateSellerScore(sellerId);

    // Calculate positive ratio score
    const score =
      scores.totalRatings > 0
        ? (scores.positiveRatings / scores.totalRatings) * 5
        : 0;

    return {
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      averageRating: Math.round(scores.averageRating * 10) / 10,
      totalRatings: scores.totalRatings,
      positiveRatings: scores.positiveRatings,
    };
  }

  private async updateSellerAggregates(sellerId: number) {
    const scores = await this.ratingRepo.calculateSellerScore(sellerId);

    const positiveRatioScore =
      scores.totalRatings > 0
        ? (scores.positiveRatings / scores.totalRatings) * 5
        : 0;

    await this.userRepo.update(sellerId, {
      sellerRating: positiveRatioScore,
      totalRatings: scores.totalRatings,
      positiveRatings: scores.positiveRatings,
    });
  }
}
```

### Phase 4: Type Definitions

**Create:** `apps/api/src/types/rating/rating.types.ts`

```typescript
export interface RateSellerDTO {
  sellerId: number;
  postId?: number;
  rating: number; // 1-5
  comment?: string;
}

export interface SellerRatingResponseDTO {
  id: number;
  rating: number;
  comment?: string;
  rater: {
    id: number;
    fullName: string;
    profilePictureUrl?: string;
  };
  post?: {
    id: number;
    title: string;
  };
  createdAt: Date;
}

export interface SellerScoreDTO {
  score: number; // Positive ratio score (0-5)
  averageRating: number; // Average of all ratings (0-5)
  totalRatings: number;
  positiveRatings: number; // Ratings >= 4
  displayText: string; // e.g., "4.8 ★" or "New Seller"
  recentRatings?: SellerRatingResponseDTO[];
}
```

### Phase 5: API Routes

**Create:** `apps/api/src/routes/ratings.routes.ts`

```typescript
import { Router } from "express";
import { RatingService } from "../services/RatingService";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";

const router = Router();
const ratingService = new RatingService();

// POST /api/v1/ratings - Create a new rating
router.post("/", authenticate, validateRequest, async (req, res, next) => {
  try {
    const { sellerId, postId, rating, comment } = req.body;
    const raterId = req.user!.id;

    const newRating = await ratingService.createRating({
      sellerId,
      raterId,
      postId,
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      data: newRating,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/ratings/seller/:sellerId - Get ratings for a seller
router.get("/seller/:sellerId", async (req, res, next) => {
  try {
    const sellerId = parseInt(req.params.sellerId);
    const limit = parseInt(req.query.limit as string) || 10;

    const ratings = await ratingService.getSellerRatings(sellerId, limit);

    res.json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/ratings/seller/:sellerId/score - Get seller score
router.get("/seller/:sellerId/score", async (req, res, next) => {
  try {
    const sellerId = parseInt(req.params.sellerId);
    const score = await ratingService.getSellerScore(sellerId);

    res.json({
      success: true,
      data: score,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Update:** `apps/api/src/routes/index.ts`

```typescript
import ratingRoutes from "./ratings.routes";

// ... existing routes

app.use("/api/v1/ratings", ratingRoutes);
```

### Phase 6: Update User Endpoints

**Extend:** `apps/api/src/routes/users.routes.ts`

Update `GET /api/v1/users/:id` to include seller rating in response:

```typescript
router.get("/:id", async (req, res, next) => {
  try {
    const user = await userService.getUserById(parseInt(req.params.id));

    // Include rating info
    const response = {
      ...user,
      sellerScore: {
        score: user.sellerRating || 0,
        totalRatings: user.totalRatings || 0,
        displayText:
          user.totalRatings >= 3
            ? `${user.sellerRating?.toFixed(1)} ★`
            : "New Seller",
      },
    };

    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});
```

### Phase 7: Frontend Integration

**Update:** `apps/web/src/routes/profile/+page.svelte`

Replace mock rating with real API data:

```typescript
// Before (mock):
const stats = {
  rating: 4.8,
  totalRatings: 42,
  // ...
};

// After (real data):
async function loadSellerScore(userId: number) {
  const response = await fetch(`/api/v1/ratings/seller/${userId}/score`);
  const { data } = await response.json();
  return data;
}

onMount(async () => {
  const sellerScore = await loadSellerScore(currentUser.id);
  stats.rating = sellerScore.score;
  stats.totalRatings = sellerScore.totalRatings;
});
```

**Create:** Rating submission component (e.g., after transaction completion):

```svelte
<!-- apps/web/src/lib/components/RatingModal.svelte -->
<script lang="ts">
  export let sellerId: number;
  export let postId: number | undefined;
  export let onSubmit: () => void;

  let rating = 0;
  let comment = '';

  async function submitRating() {
    const response = await fetch('/api/v1/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellerId, postId, rating, comment }),
    });

    if (response.ok) {
      onSubmit();
    }
  }
</script>

<div class="rating-modal">
  <h3>Rate this seller</h3>
  <div class="stars">
    {#each [1, 2, 3, 4, 5] as star}
      <button on:click={() => rating = star}>
        {star <= rating ? '★' : '☆'}
      </button>
    {/each}
  </div>
  <textarea bind:value={comment} placeholder="Share your experience (optional)"></textarea>
  <button on:click={submitRating} disabled={rating === 0}>Submit Rating</button>
</div>
```

---

## Technical Considerations

### 0. Multi-Database Support

**Database Compatibility:**

The implementation is designed to work seamlessly with both PostgreSQL and SQL Server:

**Data Types:**

- `DECIMAL(3, 2)` - Supported by both databases for rating scores (0.00 to 5.00)
- `TEXT` / `NVARCHAR(MAX)` - Prisma automatically maps based on provider
- `TIMESTAMPTZ` (PostgreSQL) / `DATETIME2` (SQL Server) - Handled by Prisma DateTime
- `SERIAL` (PostgreSQL) / `IDENTITY` (SQL Server) - Auto-increment handled by `@default(autoincrement())`

**Aggregation Functions:**

- `AVG()`, `COUNT()`, `SUM()` - Standard SQL functions supported by both databases
- Prisma's aggregate methods (`_avg`, `_count`) are database-agnostic

**Index Syntax:**

- Prisma generates appropriate index syntax for each database
- `@@index` directives work uniformly across providers

**Testing Requirement:**

- Run integration tests on both PostgreSQL and SQL Server instances
- Verify migration scripts execute successfully on both platforms
- Test aggregate calculations return identical results

**Configuration:**

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/dec_l_db"

# SQL Server
DATABASE_URL="sqlserver://localhost:1433;database=DEC_L;user=sa;password=YourPassword;encrypt=true"
```

Update `prisma/schema.prisma` datasource provider accordingly:

```prisma
datasource db {
  provider = "postgresql" // or "sqlserver"
  url      = env("DATABASE_URL")
}
```

### 1. Rating Eligibility Logic

**Current Implementation:** Allow rating after any message exchange between buyer and seller.

```typescript
// In RatingService.createRating()
const hasInteraction = await this.messageRepo.findOne({
  OR: [
    { senderId: data.raterId, recipientId: data.sellerId },
    { senderId: data.sellerId, recipientId: data.raterId },
  ],
  isDeleted: false,
});

if (!hasInteraction) {
  throw new ForbiddenError("Can only rate seller after message exchange");
}
```

**Benefits:**

- More inclusive - captures all buyer-seller interactions
- Encourages communication before transactions
- Lower barrier to building seller reputation
- Useful for scenarios where payment isn't tracked in the system

**Considerations:**

- Higher risk of rating manipulation (users could message just to leave ratings)
- May include ratings from non-buyers (users who inquired but didn't purchase)
- Consider adding additional validation (e.g., minimum message count, time between messages)

**Alternative (Stricter):** Require confirmed payment before allowing rating:

```typescript
// Stricter approach - requires payment
const confirmedPayment = await paymentRepo.findOne({
  postId: data.postId,
  userId: data.raterId,
  status: "Confirmed",
});

if (!confirmedPayment) {
  throw new ForbiddenError("Can only rate after confirmed transaction");
}
```

**Enhanced Validation (Optional):**

```typescript
// Require bidirectional message exchange (conversation)
const messageCount = await this.messageRepo.count({
  OR: [
    { senderId: data.raterId, recipientId: data.sellerId },
    { senderId: data.sellerId, recipientId: data.raterId },
  ],
  isDeleted: false,
});

if (messageCount < 2) {
  throw new ForbiddenError("Requires at least 2 messages exchanged to rate");
}
```

### 2. Score Display Threshold

**Recommended:** Show "New Seller" instead of score for sellers with < 3 ratings.

```typescript
const displayText =
  user.totalRatings >= 3 ? `${user.sellerRating?.toFixed(1)} ★` : "New Seller";
```

**Rationale:** Prevents premature judgments based on insufficient data.

### 3. Rating Update vs. Immutability

**Current Design:** Ratings are immutable (cannot be edited after creation).

**Future Enhancement:** Allow editing within 24 hours:

- Add `isEdited` boolean and `editedAt` timestamp
- Track edit history in separate table if needed
- Update aggregate scores on edit

### 4. Rating Moderation

**Optional Enhancement:** Add moderation capabilities for disputed reviews:

```prisma
model SellerRating {
  // ... existing fields
  isHidden       Boolean  @default(false) @map("IsHidden")
  moderatorNotes String?  @db.Text @map("ModeratorNotes")
  moderatedBy    Int?     @map("ModeratedBy")
  moderatedAt    DateTime? @map("ModeratedAt") @db.Timestamp
}
```

### 5. Performance Optimization

**Aggregate Updates:**

- Current approach: Synchronous update on each rating creation
- Alternative: Async queue for high-volume scenarios
- Future: Scheduled batch recalculation (e.g., hourly cron job)

**Caching:**

- Cache seller scores in Redis for frequently viewed profiles
- TTL: 5-10 minutes
- Invalidate on new rating creation

### 6. Score Calculation Formula

**Current Formula:**

```
score = (positive_ratings / total_ratings) × 5
where positive_ratings = count(rating >= 4)
```

**Alternative Formulas to Consider:**

1. **Simple Average:**

   ```
   score = sum(all_ratings) / count(all_ratings)
   ```

2. **Weighted by Recency:**

   ```
   score = (recent_ratings × 0.7) + (older_ratings × 0.3)
   ```

3. **Bayesian Average** (prevents manipulation from few ratings):
   ```
   score = (C × m + sum(ratings)) / (C + count(ratings))
   where C = confidence factor, m = global average
   ```

---

## Testing Requirements

### Unit Tests

1. **RatingService:**
   - ✅ Successfully create rating with valid data
   - ✅ Reject rating outside 1-5 range
   - ✅ Prevent self-rating
   - ✅ Prevent duplicate ratings
   - ✅ Require confirmed payment for post ratings
   - ✅ Correctly calculate aggregate scores
   - ✅ Update User aggregate fields

2. **SellerRatingRepository:**
   - ✅ CRUD operations
   - ✅ Score calculation accuracy
   - ✅ Query performance with large datasets

### Integration Tests

1. **API Endpoints:**
   - ✅ POST /api/v1/ratings - authenticated request
   - ✅ GET /api/v1/ratings/seller/:id - public access
   - ✅ GET /api/v1/ratings/seller/:id/score - public access
   - ✅ Error handling (400, 401, 403, 404)

2. **Database:**
   - ✅ Unique constraint enforcement
   - ✅ Cascading behavior on user deletion
   - ✅ Index performance on large datasets

### E2E Tests

1. **User Flow:**
   - Complete purchase → Rate seller → View updated profile
   - Attempt duplicate rating (should fail)
   - View seller ratings on profile page

---

## Migration Strategy

### Step 1: Schema Migration (Zero Downtime)

```bash
# 1. Run migration in dev/staging
npx prisma migrate dev --name add_seller_rating_system

# 2. Test thoroughly
npm run test

# 3. Deploy to production (off-peak hours)
npx prisma migrate deploy
```

### Step 2: Backfill Existing Users (Optional)

If you want to initialize ratings for existing users:

```typescript
// One-time script: apps/api/src/scripts/initialize-user-ratings.ts
async function initializeRatings() {
  await prisma.user.updateMany({
    data: {
      sellerRating: 0,
      totalRatings: 0,
      positiveRatings: 0,
    },
  });
  console.log("All users initialized with default ratings");
}
```

### Step 3: Gradual Rollout

1. **Week 1:** Backend API only (no UI)
2. **Week 2:** Add "Rate Seller" button (limited users)
3. **Week 3:** Full rollout with monitoring
4. **Week 4:** Add rating display to listings

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Rating Activity:**
   - Total ratings created per day
   - Average rating value
   - Distribution of 1-5 star ratings

2. **User Engagement:**
   - % of buyers who rate after purchase
   - Time between purchase and rating
   - Sellers with most ratings

3. **Quality Indicators:**
   - % of ratings with comments
   - Average comment length
   - Flagged/moderated ratings

### Dashboard Queries

**PostgreSQL:**

```sql
-- Average rating across platform
SELECT AVG("Rating") FROM "SellerRatings";

-- Top rated sellers
SELECT "SellerID", "SellerRating", "TotalRatings"
FROM "Users"
WHERE "TotalRatings" >= 5
ORDER BY "SellerRating" DESC
LIMIT 10;

-- Rating distribution
SELECT "Rating", COUNT(*) as "Count"
FROM "SellerRatings"
GROUP BY "Rating"
ORDER BY "Rating" DESC;
```

**SQL Server:**

```sql
-- Average rating across platform
SELECT AVG([Rating]) FROM [SellerRatings];

-- Top rated sellers
SELECT TOP 10 [SellerID], [SellerRating], [TotalRatings]
FROM [Users]
WHERE [TotalRatings] >= 5
ORDER BY [SellerRating] DESC;

-- Rating distribution
SELECT [Rating], COUNT(*) as [Count]
FROM [SellerRatings]
GROUP BY [Rating]
ORDER BY [Rating] DESC;
```

**Using Prisma (Database-Agnostic - Recommended):**

```typescript
// Average rating across platform
const avgRating = await prisma.sellerRating.aggregate({
  _avg: { rating: true },
});

// Top rated sellers
const topSellers = await prisma.user.findMany({
  where: { totalRatings: { gte: 5 } },
  orderBy: { sellerRating: "desc" },
  take: 10,
  select: { id: true, fullName: true, sellerRating: true, totalRatings: true },
});

// Rating distribution
const distribution = await prisma.sellerRating.groupBy({
  by: ["rating"],
  _count: { rating: true },
  orderBy: { rating: "desc" },
});
```

---

## Future Enhancements

### Short-term (1-3 months)

- [ ] Allow sellers to respond to ratings
- [ ] Add "verified purchase" badge for payment-based ratings
- [ ] Email notification when seller receives new rating
- [ ] Filter/sort posts by seller rating

### Medium-term (3-6 months)

- [ ] Rating moderation queue for admins
- [ ] Dispute resolution workflow
- [ ] Rating analytics dashboard for sellers
- [ ] Buyer rating system (rate buyers for payment speed, communication)

### Long-term (6+ months)

- [ ] Machine learning for fake rating detection
- [ ] Seller reputation badges ("Top Seller", "5-Star Seller")
- [ ] Integration with Instagram posts (show rating)
- [ ] Weighted scoring based on rater credibility

---

## Success Criteria

### Launch Goals (30 days)

- [ ] 20% of completed transactions result in ratings
- [ ] Average rating >= 4.0 across platform
- [ ] < 1% of ratings flagged/disputed
- [ ] Zero downtime during rollout

### Long-term Goals (90 days)

- [ ] 40% rating adoption rate
- [ ] Correlation between seller rating and transaction volume
- [ ] Positive user feedback on feature
- [ ] Reduced buyer-seller disputes

---

## Open Questions & Decisions Needed

1. **Rating Timing:** When should buyers be prompted to rate?
   - [ ] Immediately after payment confirmation
   - [ ] 24 hours after delivery
   - [ ] After marking order as complete

2. **Rating Visibility:** Should ratings be:
   - [ ] Always public
   - [ ] Hidden until seller has 3+ ratings
   - [ ] Partially visible (count only, not details)

3. **Negative Rating Threshold:** What constitutes a "negative" rating?
   - [ ] < 4 stars (current recommendation)
   - [ ] < 3 stars
   - [ ] Only 1-2 stars

4. **Self-Service:** Can sellers:
   - [ ] Request rating removal (with admin approval)
   - [ ] Hide ratings temporarily
   - [ ] Reply to ratings

---

## References

- Existing pattern: `Like` model (apps/api/prisma/schema.prisma#L119-L135)
- Repository pattern: `BaseRepository` (apps/api/src/repositories/BaseRepository.ts)
- Service pattern: `UserService` (apps/api/src/services/UserService.ts)
- Frontend profile: apps/web/src/routes/profile/+page.svelte#L126

---

**Document Version:** 1.0  
**Last Updated:** January 6, 2026  
**Author:** System Architect  
**Reviewers:** [Pending]
