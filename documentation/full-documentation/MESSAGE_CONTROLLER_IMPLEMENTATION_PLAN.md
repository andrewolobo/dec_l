# Message Controller Implementation Plan

> Created: January 6, 2026

## Overview

Build the backend message controller layer connecting the existing Prisma schema to the frontend messaging UI, following established patterns for DTOs, repository, service, controller, and routes.

---

## Current State

### What Exists

| Component                | Status | Location                                       |
| ------------------------ | ------ | ---------------------------------------------- |
| Prisma Message model     | ✅     | `apps/api/prisma/schema.prisma`                |
| Frontend types           | ✅     | `apps/web/src/lib/types/message.types.ts`      |
| Frontend message service | ✅     | `apps/web/src/lib/services/message.service.ts` |
| Frontend message store   | ✅     | `apps/web/src/lib/stores/message.store.ts`     |
| Mock data utilities      | ✅     | `apps/web/src/lib/utils/mock-messages.ts`      |
| Messages UI pages        | ✅     | `apps/web/src/routes/messages/`                |

### What Needs to Be Built

| Component               | Status | Target Location                                       |
| ----------------------- | ------ | ----------------------------------------------------- |
| Message types (backend) | ❌     | `apps/api/src/types/message/message.types.ts`         |
| Message validation      | ❌     | `apps/api/src/validation/message.validation.ts`       |
| Message repository      | ❌     | `apps/api/src/dal/repositories/message.repository.ts` |
| Message service         | ❌     | `apps/api/src/services/message.service.ts`            |
| Message controller      | ❌     | `apps/api/src/controllers/message.controller.ts`      |
| Message routes          | ❌     | `apps/api/src/routes/message.routes.ts`               |

---

## Schema Analysis

### Current Message Model

```prisma
model Message {
  id             Int       @id @default(autoincrement()) @map("MessageID")
  senderId       Int       @map("SenderID")
  recipientId    Int       @map("RecipientID")
  postId         Int?      @map("PostID")
  content        String    @db.NVarChar(Max) @map("MessageContent")
  messageType    String    @default("text") @db.NVarChar(20) @map("MessageType")
  attachmentUrl  String?   @db.NVarChar(500) @map("AttachmentURL")
  isRead         Boolean   @default(false) @map("IsRead")
  readAt         DateTime? @map("ReadAt") @db.DateTime2
  isDeleted      Boolean   @default(false) @map("IsDeleted")
  deletedBy      Int?      @map("DeletedBy")
  isEdited       Boolean   @default(false) @map("IsEdited")
  editedAt       DateTime? @map("EditedAt") @db.DateTime2
  parentMessageId Int?     @map("ParentMessageID")
  createdAt      DateTime  @default(now()) @map("CreatedAt") @db.DateTime2
  updatedAt      DateTime  @updatedAt @map("UpdatedAt") @db.DateTime2

  // Relations
  sender         User      @relation("SentMessages", ...)
  recipient      User      @relation("ReceivedMessages", ...)
  post           Post?     @relation(...)
  parentMessage  Message?  @relation("MessageReplies", ...)
  replies        Message[] @relation("MessageReplies")

  @@map("Messages")
}
```

### Recommended Schema Enhancements

Add indexes for efficient conversation queries:

```prisma
@@index([senderId], map: "IX_Messages_SenderID")
@@index([recipientId], map: "IX_Messages_RecipientID")
@@index([senderId, recipientId], map: "IX_Messages_Conversation")
@@index([postId], map: "IX_Messages_PostID")
@@index([createdAt(sort: Desc)], map: "IX_Messages_CreatedAt")
```

---

## Implementation Steps

### Step 1: Create Message Types

**File:** `apps/api/src/types/message/message.types.ts`

```typescript
// Message type enum
export type MessageType = "text" | "image" | "system";

// Create message DTO
export interface CreateMessageDTO {
  recipientId: number;
  messageContent: string;
  messageType?: MessageType;
  postId?: number;
  attachmentUrl?: string;
  parentMessageId?: number;
}

// Update message DTO
export interface UpdateMessageDTO {
  messageContent?: string;
  isRead?: boolean;
  isDeleted?: boolean;
}

// Message response DTO
export interface MessageResponseDTO {
  messageId: number;
  senderId: number;
  recipientId: number;
  postId?: number;
  messageContent: string;
  messageType: MessageType;
  attachmentUrl?: string;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedBy?: number;
  isEdited: boolean;
  editedAt?: Date;
  parentMessageId?: number;
  createdAt: Date;
  updatedAt: Date;
  sender?: MessageUserDTO;
  recipient?: MessageUserDTO;
  post?: MessagePostDTO;
}

// Conversation preview DTO
export interface ConversationPreviewDTO {
  userId: number;
  fullName: string;
  profilePictureUrl?: string;
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageSenderId: number;
  unreadCount: number;
  isOnline?: boolean;
  postId?: number;
  postTitle?: string;
}

// Supporting DTOs
export interface MessageUserDTO {
  userId: number;
  fullName: string;
  profilePictureUrl?: string;
  isOnline?: boolean;
}

export interface MessagePostDTO {
  postId: number;
  title: string;
  price: number;
  imageUrl?: string;
  status: string;
}

// Query options
export interface MessageQueryOptions {
  limit?: number;
  offset?: number;
  postId?: number;
}

export interface ConversationQueryOptions {
  limit?: number;
  offset?: number;
}
```

### Step 2: Create Validation Schemas

**File:** `apps/api/src/validation/message.validation.ts`

```typescript
import Joi from "joi";

export const createMessageSchema = Joi.object({
  recipientId: Joi.number().integer().positive().required().messages({
    "number.base": "Recipient ID must be a number",
    "any.required": "Recipient ID is required",
  }),
  messageContent: Joi.string().min(1).max(5000).required().messages({
    "string.min": "Message cannot be empty",
    "string.max": "Message cannot exceed 5000 characters",
    "any.required": "Message content is required",
  }),
  messageType: Joi.string().valid("text", "image", "system").default("text"),
  postId: Joi.number().integer().positive().optional(),
  attachmentUrl: Joi.string().uri().max(500).optional(),
  parentMessageId: Joi.number().integer().positive().optional(),
});

export const updateMessageSchema = Joi.object({
  messageContent: Joi.string().min(1).max(5000).optional(),
});

export const messageIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const userIdSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
});

export const conversationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

export const messageQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  postId: Joi.number().integer().positive().optional(),
});
```

### Step 3: Create Message Repository

**File:** `apps/api/src/dal/repositories/message.repository.ts`

Key methods:

- `create(data)` - Create new message
- `findById(id)` - Get message by ID with relations
- `findByConversation(userId1, userId2, options)` - Get messages between two users
- `getConversationList(userId, options)` - Get all conversations for a user
- `markAsRead(messageId, userId)` - Mark message as read
- `markConversationAsRead(userId, otherUserId)` - Mark all messages in conversation as read
- `softDelete(messageId, userId)` - Soft delete a message
- `update(messageId, data)` - Update message content
- `getUnreadCount(userId)` - Get total unread count for user

### Step 4: Create Message Service

**File:** `apps/api/src/services/message.service.ts`

Business logic layer with authorization checks:

- `sendMessage(senderId, dto)` - Validate recipient exists, create message
- `getConversations(userId, options)` - Get conversation list with previews
- `getMessages(userId, otherUserId, options)` - Get message thread (verify user is participant)
- `markAsRead(userId, messageId)` - Mark single message as read (verify ownership)
- `markConversationAsRead(userId, otherUserId)` - Mark all messages as read
- `editMessage(userId, messageId, content)` - Edit message (verify sender, within time limit)
- `deleteMessage(userId, messageId)` - Soft delete message (verify participant)
- `getUnreadCount(userId)` - Get unread message count

### Step 5: Create Message Controller

**File:** `apps/api/src/controllers/message.controller.ts`

HTTP handlers following existing patterns:

```typescript
export class MessageController {
  // POST /api/v1/messages
  async sendMessage(req, res, next);

  // GET /api/v1/messages/conversations
  async getConversations(req, res, next);

  // GET /api/v1/messages/user/:userId
  async getMessages(req, res, next);

  // POST /api/v1/messages/:id/read
  async markAsRead(req, res, next);

  // POST /api/v1/messages/conversations/:userId/read
  async markConversationAsRead(req, res, next);

  // PUT /api/v1/messages/:id
  async updateMessage(req, res, next);

  // DELETE /api/v1/messages/:id
  async deleteMessage(req, res, next);

  // GET /api/v1/messages/unread-count
  async getUnreadCount(req, res, next);
}
```

### Step 6: Create Message Routes

**File:** `apps/api/src/routes/message.routes.ts`

```typescript
import { Router } from "express";
import { messageController } from "../controllers";
import {
  authenticate,
  validate,
  validateParams,
  validateQuery,
} from "../middleware";
import {
  createLimiter,
  readLimiter,
} from "../middleware/rate-limit.middleware";
import {
  createMessageSchema,
  updateMessageSchema,
  messageIdSchema,
  userIdSchema,
  conversationQuerySchema,
  messageQuerySchema,
} from "../validation/message.validation";

const router = Router();

// All message routes require authentication
router.use(authenticate);

// Conversations
router.get(
  "/conversations",
  readLimiter,
  validateQuery(conversationQuerySchema),
  messageController.getConversations
);
router.post(
  "/conversations/:userId/read",
  createLimiter,
  validateParams(userIdSchema),
  messageController.markConversationAsRead
);

// Messages
router.post(
  "/",
  createLimiter,
  validate(createMessageSchema),
  messageController.sendMessage
);
router.get(
  "/user/:userId",
  readLimiter,
  validateParams(userIdSchema),
  validateQuery(messageQuerySchema),
  messageController.getMessages
);
router.get("/unread-count", readLimiter, messageController.getUnreadCount);

// Single message operations
router.post(
  "/:id/read",
  createLimiter,
  validateParams(messageIdSchema),
  messageController.markAsRead
);
router.put(
  "/:id",
  createLimiter,
  validateParams(messageIdSchema),
  validate(updateMessageSchema),
  messageController.updateMessage
);
router.delete(
  "/:id",
  createLimiter,
  validateParams(messageIdSchema),
  messageController.deleteMessage
);

export default router;
```

### Step 7: Wire Up Routes

Update `apps/api/src/routes/index.ts`:

```typescript
export { default as messageRoutes } from "./message.routes";
```

Update `apps/api/src/app.ts` or main router:

```typescript
app.use("/api/v1/messages", messageRoutes);
```

---

## API Endpoints Summary

| Method | Endpoint                                      | Description               | Auth     |
| ------ | --------------------------------------------- | ------------------------- | -------- |
| GET    | `/api/v1/messages/conversations`              | List all conversations    | Required |
| GET    | `/api/v1/messages/user/:userId`               | Get messages with user    | Required |
| POST   | `/api/v1/messages`                            | Send a message            | Required |
| PUT    | `/api/v1/messages/:id`                        | Edit a message            | Required |
| DELETE | `/api/v1/messages/:id`                        | Delete a message          | Required |
| POST   | `/api/v1/messages/:id/read`                   | Mark message as read      | Required |
| POST   | `/api/v1/messages/conversations/:userId/read` | Mark conversation as read | Required |
| GET    | `/api/v1/messages/unread-count`               | Get unread count          | Required |

---

## Frontend Integration

The frontend already has:

- `MessageService` in `apps/web/src/lib/services/message.service.ts` with API call stubs
- `messageStore` in `apps/web/src/lib/stores/message.store.ts` for state management
- WebSocket handling for real-time updates (future phase)

After implementing the backend, update the frontend service to call the actual API endpoints instead of mock data.

---

## Future Enhancements

### Phase 2: WebSocket Real-time Updates

```
WS /messages?token=<auth_token>

Events:
- message: New message received
- message_read: Message marked as read
- message_edited: Message was edited
- message_deleted: Message was deleted
- typing: User is typing indicator
```

### Phase 3: Additional Features

- Message reactions
- File/image attachments upload
- Message search
- Conversation archiving
- Block/mute users
- Message notifications (push/email)

---

## Testing Strategy

1. **Unit Tests:** Repository and service layer methods
2. **Integration Tests:** API endpoint testing with test database
3. **E2E Tests:** Frontend-to-backend message flow

---

## Files to Create/Modify

### New Files

| File                                                  | Purpose                    |
| ----------------------------------------------------- | -------------------------- |
| `apps/api/src/types/message/message.types.ts`         | TypeScript DTOs            |
| `apps/api/src/types/message/index.ts`                 | Export barrel              |
| `apps/api/src/validation/message.validation.ts`       | Joi validation schemas     |
| `apps/api/src/dal/repositories/message.repository.ts` | Prisma database operations |
| `apps/api/src/services/message.service.ts`            | Business logic             |
| `apps/api/src/controllers/message.controller.ts`      | HTTP handlers              |
| `apps/api/src/routes/message.routes.ts`               | Route definitions          |

### Files to Update

| File                                     | Change                    |
| ---------------------------------------- | ------------------------- |
| `apps/api/src/types/index.ts`            | Export message types      |
| `apps/api/src/dal/repositories/index.ts` | Export message repository |
| `apps/api/src/services/index.ts`         | Export message service    |
| `apps/api/src/controllers/index.ts`      | Export message controller |
| `apps/api/src/routes/index.ts`           | Export message routes     |
| `apps/api/src/app.ts`                    | Mount message routes      |
| `apps/api/prisma/schema.prisma`          | Add recommended indexes   |
