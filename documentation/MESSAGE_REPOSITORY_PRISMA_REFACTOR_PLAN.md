# Message Repository: Raw SQL to Prisma Query Builder Refactor Plan

**Date:** January 7, 2026  
**Status:** Planning Phase  
**Priority:** High  
**Reason:** Fix SQL Server/PostgreSQL compatibility issues with raw SQL queries

---

## Executive Summary

Convert the `MessageRepository.getConversationList()` method from raw PostgreSQL SQL (using CTEs and window functions) to Prisma Query Builder, eliminating the `LIMIT` vs `OFFSET...FETCH` syntax compatibility issue between SQL Server and PostgreSQL while maintaining the exact `ConversationPreviewDTO` interface.

**Current Issue:** Raw SQL query uses PostgreSQL-specific `LIMIT/OFFSET` syntax, causing `Code: 102. Message: 'Incorrect syntax near 'LIMIT''` error when running against SQL Server.

---

## Current State Analysis

### Files Using Raw SQL

**Only 1 file** in the entire DAL uses raw SQL queries:

- **File:** `apps/api/src/dal/repositories/message.repository.ts`
- **Method:** `getConversationList()` (Lines 162-239)
- **All other repositories:** Already use Prisma Query Builder exclusively ✓

### Raw SQL Query Analysis

#### Method: `getConversationList(userId, options)`

**Purpose:** Get a paginated list of all conversations for a user, showing:

- The other user's details (name, profile picture)
- The last message in each conversation
- Unread message count per conversation
- Associated post information (if any)

**Query Complexity:**

- **3 Common Table Expressions (CTEs):**
  1. `ConversationUsers`: Finds all unique users this user has messaged
  2. `LastMessages`: Gets the most recent message per conversation using `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)`
  3. `UnreadCounts`: Aggregates unread message counts per sender

- **Complex SQL Features:**
  - Window function: `ROW_NUMBER() OVER (PARTITION BY cu."OtherUserId" ORDER BY m."CreatedAt" DESC)`
  - Multiple CTEs with dependencies
  - CASE expressions for bidirectional conversations
  - LEFT JOINs for optional post information
  - Aggregation with GROUP BY
  - Bigint to number conversion in JavaScript

**Why Raw SQL Was Used:**
This query pattern is difficult to express in Prisma without multiple round trips:

1. Complex window functions (`ROW_NUMBER()`)
2. Multiple CTEs with cross-dependencies
3. Bidirectional relationship handling (messages sent OR received)
4. Aggregations across different groupings

### Dependencies & Impact

**Direct Consumers:**

1. **Service:** `MessageService.getConversations()` - `apps/api/src/services/message.service.ts`
2. **Controller:** `MessageController.getConversations()` - `apps/api/src/controllers/message.controller.ts`
3. **Route:** `GET /api/v1/messages/conversations`

**Return Type Contract:**

```typescript
export interface ConversationPreviewDTO {
  userId: number;
  fullName: string;
  profilePictureUrl?: string;
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageSenderId: number;
  unreadCount: number;
  isOnline?: boolean; // Added by service layer
  postId?: number;
  postTitle?: string;
}
```

**Critical Constraint:** Any refactoring **must** maintain this exact interface.

### Database Configuration

- **Current Provider:** PostgreSQL (configured via `DATABASE_URL`)
- **Historical Note:** Originally supported dual SQL Server/PostgreSQL
- **Prisma Schema:** `datasource db { provider = "postgresql" }`
- **No Provider Detection Logic:** Configuration is purely environment-based

---

## Refactoring Plan

### Step 1: Replace CTE-based Raw SQL with Sequential Prisma Queries

**File:** `apps/api/src/dal/repositories/message.repository.ts`  
**Method:** `getConversationList()` (Lines 162-239)

**Approach:**

1. Fetch all messages involving the user (sent or received)
2. Group by conversation partner using JavaScript `Map`
3. Extract the latest message per conversation
4. Calculate unread counts with separate Prisma aggregations
5. Apply pagination after grouping

**Implementation Strategy:**

```typescript
async getConversationList(
  userId: number,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const { limit = 20, offset = 0 } = options || {};

  // Step 1: Fetch all messages involving the user (limited by a reasonable window)
  // Note: We need to fetch more than limit+offset to ensure we get enough unique conversations
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { recipientId: userId }
      ],
      isDeleted: false
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          profilePictureUrl: true
        }
      },
      recipient: {
        select: {
          id: true,
          fullName: true,
          profilePictureUrl: true
        }
      },
      post: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    // Fetch enough messages to ensure we get unique conversations
    // This is a heuristic - adjust based on average messages per conversation
    take: (limit + offset) * 20
  });

  // Step 2: Group by conversation partner and get last message
  const conversationMap = new Map<number, ConversationPreviewDTO>();

  for (const message of messages) {
    const partnerId = message.senderId === userId
      ? message.recipientId
      : message.senderId;

    // Only add if not already in map (messages are ordered by createdAt desc)
    if (!conversationMap.has(partnerId)) {
      const partner = message.senderId === userId
        ? message.recipient
        : message.sender;

      conversationMap.set(partnerId, {
        userId: partnerId,
        fullName: partner.fullName,
        profilePictureUrl: partner.profilePictureUrl ?? undefined,
        lastMessage: message.content,
        lastMessageAt: message.createdAt,
        lastMessageSenderId: message.senderId,
        unreadCount: 0, // Will be calculated in next step
        postId: message.postId ?? undefined,
        postTitle: message.post?.title ?? undefined
      });
    }
  }

  // Step 3: Calculate unread counts in parallel
  const conversationArray = Array.from(conversationMap.values());
  const conversationsWithUnread = await Promise.all(
    conversationArray.map(async (conv) => {
      const unreadCount = await prisma.message.count({
        where: {
          senderId: conv.userId,
          recipientId: userId,
          isReadByRecipient: false,
          isDeleted: false
        }
      });

      return {
        ...conv,
        unreadCount
      };
    })
  );

  // Step 4: Apply pagination
  const paginatedConversations = conversationsWithUnread
    .slice(offset, offset + limit);

  return paginatedConversations;
}
```

**Trade-offs:**

- ✅ Database-agnostic (works on both PostgreSQL and SQL Server)
- ✅ No raw SQL syntax issues
- ✅ Easier to maintain and understand
- ⚠️ More queries (1 message fetch + N unread counts)
- ⚠️ Client-side grouping (but messages are indexed)
- ⚠️ May fetch more messages than needed (heuristic: limit \* 20)

---

### Step 2: Create Helper Method for Conversation Discovery

**File:** `apps/api/src/dal/repositories/message.repository.ts`

**Add new private method:**

```typescript
/**
 * Get unique conversation partner IDs for a user
 */
private async getConversationPartnerIds(userId: number): Promise<number[]> {
  // Get distinct sender IDs where user is recipient
  const receivedFrom = await prisma.message.findMany({
    where: {
      recipientId: userId,
      isDeleted: false
    },
    distinct: ['senderId'],
    select: {
      senderId: true
    }
  });

  // Get distinct recipient IDs where user is sender
  const sentTo = await prisma.message.findMany({
    where: {
      senderId: userId,
      isDeleted: false
    },
    distinct: ['recipientId'],
    select: {
      recipientId: true
    }
  });

  // Combine and deduplicate
  const partnerIds = new Set<number>([
    ...receivedFrom.map(m => m.senderId),
    ...sentTo.map(m => m.recipientId)
  ]);

  return Array.from(partnerIds);
}
```

**Purpose:** Isolate the logic for finding unique conversation partners, making the main method cleaner.

---

### Step 3: Optimize with Batched Queries

**File:** `apps/api/src/dal/repositories/message.repository.ts`

**Enhanced implementation with batching:**

```typescript
async getConversationList(
  userId: number,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const { limit = 20, offset = 0 } = options || {};

  // Step 1: Get all conversation partner IDs
  const partnerIds = await this.getConversationPartnerIds(userId);

  // Step 2: For each partner, get the latest message
  // Batch this using Promise.all for efficiency
  const conversationPromises = partnerIds.map(async (partnerId) => {
    // Get latest message in conversation
    const lastMessage = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: userId, recipientId: partnerId },
          { senderId: partnerId, recipientId: userId }
        ],
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true
          }
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true
          }
        },
        post: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!lastMessage) return null;

    // Get unread count
    const unreadCount = await prisma.message.count({
      where: {
        senderId: partnerId,
        recipientId: userId,
        isReadByRecipient: false,
        isDeleted: false
      }
    });

    const partner = lastMessage.senderId === userId
      ? lastMessage.recipient
      : lastMessage.sender;

    return {
      userId: partnerId,
      fullName: partner.fullName,
      profilePictureUrl: partner.profilePictureUrl ?? undefined,
      lastMessage: lastMessage.content,
      lastMessageAt: lastMessage.createdAt,
      lastMessageSenderId: lastMessage.senderId,
      unreadCount,
      postId: lastMessage.postId ?? undefined,
      postTitle: lastMessage.post?.title ?? undefined
    };
  });

  // Wait for all conversations to be fetched
  const allConversations = (await Promise.all(conversationPromises))
    .filter((conv): conv is ConversationPreviewDTO => conv !== null)
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

  // Apply pagination
  return allConversations.slice(offset, offset + limit);
}
```

**Trade-offs of this approach:**

- ✅ More precise (doesn't over-fetch messages)
- ✅ Explicit parallel execution
- ⚠️ Many queries (2 \* N where N = number of conversations)
- ⚠️ Could be slower for users with many conversations

**Recommendation:** Use **Step 1 approach** for initial implementation, then benchmark. If performance is acceptable, keep it for simplicity.

---

### Step 4: Add Comprehensive Test Coverage

**File:** `apps/api/src/__tests__/unit/dal/message.repository.test.ts`

**Test Cases to Add:**

```typescript
describe("MessageRepository.getConversationList", () => {
  describe("Basic Functionality", () => {
    it("should return empty array when user has no conversations", async () => {
      // Test implementation
    });

    it("should return conversations with last message for each user", async () => {
      // Test implementation
    });

    it("should include user details (fullName, profilePictureUrl)", async () => {
      // Test implementation
    });

    it("should include post details when message is related to a post", async () => {
      // Test implementation
    });
  });

  describe("Message Ordering", () => {
    it("should return most recent conversation first", async () => {
      // Test implementation
    });

    it("should show latest message per conversation", async () => {
      // Test implementation
    });

    it("should handle bidirectional conversations correctly", async () => {
      // User A sends to B, then B sends to A
      // Should show B's message as the latest
    });
  });

  describe("Unread Count", () => {
    it("should correctly count unread messages per conversation", async () => {
      // Test implementation
    });

    it("should only count messages sent TO the user (not FROM)", async () => {
      // Test implementation
    });

    it("should exclude deleted messages from unread count", async () => {
      // Test implementation
    });

    it("should return 0 unread when all messages are read", async () => {
      // Test implementation
    });
  });

  describe("Pagination", () => {
    it("should respect limit parameter", async () => {
      // Test implementation
    });

    it("should respect offset parameter", async () => {
      // Test implementation
    });

    it("should return correct page when both limit and offset are provided", async () => {
      // Test implementation
    });

    it("should use default limit of 20 when not provided", async () => {
      // Test implementation
    });
  });

  describe("Edge Cases", () => {
    it("should exclude deleted messages from conversations", async () => {
      // Test implementation
    });

    it("should handle conversations with only deleted messages", async () => {
      // Test implementation
    });

    it("should handle null profilePictureUrl", async () => {
      // Test implementation
    });

    it("should handle null postId and postTitle", async () => {
      // Test implementation
    });

    it("should handle conversations with multiple posts", async () => {
      // Should show post from latest message
    });
  });

  describe("Data Type Consistency", () => {
    it("should return ConversationPreviewDTO with exact interface", async () => {
      // Verify all required fields and types
    });

    it("should convert null to undefined for optional fields", async () => {
      // profilePictureUrl, postId, postTitle
    });

    it("should return unreadCount as number (not bigint)", async () => {
      // Test implementation
    });
  });

  describe("Performance", () => {
    it("should handle users with many conversations efficiently", async () => {
      // Create 100+ conversations, measure query time
    });

    it("should not cause N+1 query problems", async () => {
      // Monitor query count
    });
  });
});
```

---

### Step 5: Update Service Layer and Add Monitoring

**File:** `apps/api/src/services/message.service.ts`

**Changes to `getConversations()` method:**

```typescript
async getConversations(
  userId: number,
  options?: ConversationQueryOptions
): Promise<ApiResponse<ConversationPreviewDTO[]>> {
  try {
    // Add performance monitoring in development
    const startTime = process.env.NODE_ENV === 'development'
      ? Date.now()
      : null;

    const conversations = await messageRepository.getConversationList(
      userId,
      options
    );

    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`[Performance] getConversationList took ${duration}ms`);
      if (duration > 1000) {
        console.warn(`[Performance Warning] Slow query: ${duration}ms`);
      }
    }

    // Map null values to undefined for DTO compatibility
    // Note: This should now be unnecessary as repository handles it
    const mappedConversations = conversations.map((conv) => ({
      ...conv,
      profilePictureUrl: conv.profilePictureUrl ?? undefined,
      postId: conv.postId ?? undefined,
      postTitle: conv.postTitle ?? undefined,
    }));

    return {
      success: true,
      data: mappedConversations,
    };
  } catch (error) {
    console.error("[MessageService] Error fetching conversations:", error);
    return {
      success: false,
      error: {
        code: "CONVERSATIONS_FETCH_ERROR",
        message: "Failed to fetch conversations",
      },
    };
  }
}
```

**Add integration test:**

```typescript
describe("MessageService.getConversations - Integration", () => {
  it("should return conversations with correct DTO structure", async () => {
    // Test the full flow: Repository -> Service -> DTO
  });

  it("should handle service-level errors gracefully", async () => {
    // Mock repository failure
  });
});
```

---

## Performance Considerations

### Potential Performance Impact

| Aspect                 | Raw SQL (Current)     | Prisma Query Builder (Proposed)   |
| ---------------------- | --------------------- | --------------------------------- |
| **Queries**            | 1 complex query       | 1 message fetch + N unread counts |
| **Database Load**      | Single execution plan | Multiple simpler queries          |
| **Network Roundtrips** | 1                     | 1 + N (but parallelized)          |
| **Client Processing**  | Minimal               | Message grouping in memory        |
| **Maintainability**    | Low (raw SQL)         | High (Prisma ORM)                 |

### Performance Optimization Strategies

#### Option A: Accept Performance Trade-off

- **Pros:** Simpler, more maintainable, database-agnostic
- **Cons:** Slightly slower (estimated 2-5x for users with many conversations)
- **When to use:** For most applications with <100 conversations per user

#### Option B: Add Redis Caching

```typescript
async getConversationList(userId: number, options?: {...}) {
  const cacheKey = `conversations:${userId}:${offset}:${limit}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from database
  const conversations = await /* Prisma implementation */;

  // Cache for 60 seconds
  await redis.setex(cacheKey, 60, JSON.stringify(conversations));

  return conversations;
}
```

#### Option C: Denormalized Table (Advanced)

Create a `ConversationSummary` table updated via triggers or scheduled jobs:

```prisma
model ConversationSummary {
  id              Int      @id @default(autoincrement())
  userId          Int
  partnerId       Int
  lastMessageId   Int
  lastMessageAt   DateTime
  unreadCount     Int      @default(0)
  updatedAt       DateTime @updatedAt

  @@unique([userId, partnerId])
  @@index([userId, lastMessageAt])
}
```

**Recommendation:** Start with **Option A** (Prisma Query Builder). If performance monitoring shows >500ms response times for typical users, implement **Option B** (Redis caching). Reserve **Option C** for extreme scale (>10M messages).

---

## Database Indexes - Verification Needed

### Existing Indexes (from Prisma Schema)

```prisma
@@index([senderId], map: "IX_Messages_SenderID")
@@index([recipientId], map: "IX_Messages_RecipientID")
@@index([senderId, recipientId], map: "IX_Messages_Conversation")
@@index([postId], map: "IX_Messages_PostID")
@@index([createdAt(sort: Desc)], map: "IX_Messages_CreatedAt")
```

### Recommended Actions

1. **Verify Index Usage:**

   ```sql
   -- PostgreSQL
   EXPLAIN ANALYZE
   SELECT * FROM "Messages"
   WHERE ("SenderID" = 123 OR "RecipientID" = 123)
     AND "IsDeleted" = false
   ORDER BY "CreatedAt" DESC
   LIMIT 400;
   ```

2. **Consider Composite Index:**

   ```prisma
   // In schema.prisma
   @@index([recipientId, isReadByRecipient, isDeleted], map: "IX_Messages_UnreadRecipient")
   ```

   This would optimize the unread count queries.

3. **Monitor Query Performance:**

   ```typescript
   // In prisma.client.ts
   const prisma = new PrismaClient({
     log: [{ level: "query", emit: "event" }],
   });

   prisma.$on("query", (e) => {
     if (e.duration > 100) {
       console.warn(`Slow query (${e.duration}ms): ${e.query}`);
     }
   });
   ```

---

## Implementation Checklist

### Phase 1: Preparation

- [ ] Review current `getConversationList()` implementation
- [ ] Document current query execution plan (`EXPLAIN ANALYZE`)
- [ ] Capture baseline performance metrics (response time, query count)
- [ ] Create feature branch: `refactor/message-repository-prisma`

### Phase 2: Implementation

- [ ] Implement new `getConversationList()` with Prisma Query Builder
- [ ] Add `getConversationPartnerIds()` helper method
- [ ] Update TypeScript types and interfaces
- [ ] Remove raw SQL imports and dependencies

### Phase 3: Testing

- [ ] Write unit tests for new implementation (see Step 4)
- [ ] Run existing integration tests
- [ ] Add performance benchmarking tests
- [ ] Test with both PostgreSQL and SQL Server (if still supporting dual DB)
- [ ] Verify exact DTO interface compatibility

### Phase 4: Performance Validation

- [ ] Compare query execution time (new vs. old)
- [ ] Monitor database query count and complexity
- [ ] Test with various data volumes (10, 100, 1000 conversations)
- [ ] Identify any performance regressions

### Phase 5: Optimization (if needed)

- [ ] Add composite indexes for unread count queries
- [ ] Implement Redis caching (if needed)
- [ ] Consider denormalized table (if extreme performance issues)

### Phase 6: Deployment

- [ ] Code review and approval
- [ ] Merge to main branch
- [ ] Deploy to staging environment
- [ ] Monitor production metrics for 48 hours
- [ ] Document any performance changes

---

## Rollback Plan

If the refactored implementation causes issues:

1. **Immediate Rollback:**

   ```bash
   git revert <commit-hash>
   ```

2. **Database Changes:**
   - No schema changes required, so no migration rollback needed

3. **Monitoring After Rollback:**
   - Verify original functionality restored
   - Check error rates return to baseline

---

## Success Criteria

✅ **Functional Requirements:**

- [ ] All existing tests pass
- [ ] Returns exact `ConversationPreviewDTO` interface
- [ ] Handles pagination correctly
- [ ] Calculates unread counts accurately
- [ ] Works on both PostgreSQL and SQL Server

✅ **Performance Requirements:**

- [ ] Response time <500ms for typical users (<100 conversations)
- [ ] Response time <2s for power users (<1000 conversations)
- [ ] No N+1 query problems
- [ ] Database CPU usage remains <80% of baseline

✅ **Code Quality:**

- [ ] No raw SQL in repositories
- [ ] Type-safe Prisma queries
- [ ] Comprehensive test coverage (>80%)
- [ ] Clear, maintainable code

---

## Timeline Estimate

| Phase                    | Duration  | Dependencies                   |
| ------------------------ | --------- | ------------------------------ |
| Preparation              | 2 hours   | Access to both DB environments |
| Implementation           | 4 hours   | Prisma schema understanding    |
| Testing                  | 4 hours   | Test data fixtures             |
| Performance Validation   | 2 hours   | Production-like dataset        |
| Optimization (if needed) | 4-8 hours | Performance testing results    |
| Deployment               | 2 hours   | Code review approval           |

**Total:** 18-22 hours (2-3 development days)

---

## Open Questions

1. **Do we still need SQL Server support?**
   - Current schema shows `provider = "postgresql"`
   - If PostgreSQL only, simplifies testing

2. **What's the typical conversation count per user?**
   - Impacts performance optimization strategy
   - Determines if caching is necessary

3. **Are there any performance SLAs for the conversations endpoint?**
   - Helps set optimization priorities

4. **Should we add real-time updates to conversation lists?**
   - If yes, consider WebSocket integration
   - May influence caching strategy

---

## References

- **Prisma Docs:** https://www.prisma.io/docs/concepts/components/prisma-client/queries
- **Current Implementation:** `apps/api/src/dal/repositories/message.repository.ts`
- **Prisma Schema:** `apps/api/prisma/schema.prisma`
- **DTO Interface:** `packages/shared/src/dtos/conversation.dto.ts`
- **Related Issue:** SQL Server LIMIT syntax error (Code: 102)

---

## Document Status

- **Created:** January 7, 2026
- **Last Updated:** January 7, 2026
- **Status:** ✅ Planning Complete - Ready for Implementation
- **Approvals Needed:** Tech Lead, Senior Backend Engineer
