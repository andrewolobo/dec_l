# WebSocket Real-Time Messaging Migration Plan

**Created:** January 6, 2026  
**Status:** 📋 Planning Phase  
**Architecture:** WebSocket Server as Event Broker + REST API for Persistence

---

## Executive Summary

Migrate the existing HTTP-based messaging system to real-time WebSocket communication while preserving the database structure and existing REST API. The WebSocket server will act as an event broker between the frontend and backend, broadcasting real-time updates while the REST API handles data persistence.

### Current State

| Component                     | Status       | Location                                              |
| ----------------------------- | ------------ | ----------------------------------------------------- |
| Frontend WebSocket Client     | ✅ Complete  | `apps/web/src/lib/services/message.service.ts`        |
| Frontend Message Store        | ✅ Complete  | `apps/web/src/lib/stores/message.store.ts`            |
| Backend REST API              | ✅ Complete  | `apps/api/src/services/message.service.ts`            |
| Database Schema               | ✅ Complete  | `apps/api/prisma/schema.prisma`                       |
| **Backend WebSocket Server**  | ❌ Missing   | **Needs Implementation**                              |
| **WebSocket Broadcasting**    | ❌ Missing   | **Needs Implementation**                              |

### What's Already Built

#### ✅ Frontend (100% Complete)

The frontend has a **fully functional WebSocket client** ready to use:

- **Connection Management**: Auto-reconnection (5 attempts), heartbeat (30s), connection status tracking
- **Event Handling**: Handles 6 message types (`message`, `message_read`, `message_edited`, `message_deleted`, `typing`, `pong`)
- **State Management**: 30+ derived stores for reactive UI updates
- **API Integration**: 25+ methods for all messaging operations

**Current Connection Logic:**
```typescript
// From apps/web/src/lib/services/message.service.ts
const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
const url = `${wsUrl}/messages?token=${token}`;
wsConnection = new WebSocket(url);
```

#### ✅ Backend REST API (100% Complete)

The backend has **full CRUD operations** via REST endpoints:

- **8 HTTP Endpoints**: Send, fetch, edit, delete messages, mark as read, get conversations, unread count
- **Repository Layer**: Optimized Prisma queries with CTE for conversation list
- **Service Layer**: Full validation, authorization, business rules (15-min edit window, etc.)
- **Controller Layer**: Proper error handling and DTO mapping

#### ✅ Database Schema (Optimized)

```prisma
model Message {
  id             Int       @id @default(autoincrement())
  senderId       Int
  recipientId    Int
  postId         Int?
  content        String    @db.Text
  messageType    String    @default("text")
  attachmentUrl  String?
  
  // Dual-party read tracking
  isReadByRecipient Boolean   @default(false)
  recipientReadAt   DateTime?
  isReadBySender    Boolean   @default(true)
  senderReadAt      DateTime?
  
  isDeleted      Boolean   @default(false)
  deletedBy      Int?
  isEdited       Boolean   @default(false)
  editedAt       DateTime?
  parentMessageId Int?
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([senderId, recipientId])
  @@index([createdAt(sort: Desc)])
}
```

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Svelte Frontend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MessageService (WebSocket Client)                   │   │
│  │  - connectWebSocket(token)                           │   │
│  │  - sendMessage() → HTTP POST + WS broadcast          │   │
│  │  - Event handlers (message, typing, read, etc.)      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓                    ↑
                     HTTP POST            WS Events
                     (persistence)      (real-time)
                          ↓                    ↑
┌─────────────────────────────────────────────────────────────┐
│                   Backend API Server                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │  WebSocket Server (NEW)                            │     │
│  │  - Authenticate via JWT token                      │     │
│  │  - Track userId → WebSocket connections           │     │
│  │  - Broadcast events to connected users             │     │
│  │  - Handle typing indicators, heartbeat             │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  WebSocketService (NEW)                            │     │
│  │  - addConnection(userId, ws)                       │     │
│  │  - broadcastToUser(userId, message)                │     │
│  │  - broadcastToConversation(userId1, userId2, msg)  │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  MessageService (MODIFY)                           │     │
│  │  - sendMessage() → save to DB + broadcast WS       │     │
│  │  - markAsRead() → update DB + broadcast WS         │     │
│  │  - updateMessage() → update DB + broadcast WS      │     │
│  │  - deleteMessage() → soft delete DB + broadcast WS │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  MessageRepository (EXISTING)                      │     │
│  │  - create(), findById(), markAsRead(), etc.        │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                 SQL Server Database                         │
│                  Messages Table                             │
└─────────────────────────────────────────────────────────────┘
```

### Message Flow

#### Sending a Message

```
User A types message → Frontend
  ↓
HTTP POST /api/v1/messages (persist to database)
  ↓
MessageService.sendMessage() creates record
  ↓
WebSocketService.broadcastToUser(recipientId, {
  type: 'message',
  message: {...}
})
  ↓
User B receives message via WebSocket (real-time)
  ↓
Frontend updates message store → UI updates instantly
```

#### Marking Message as Read

```
User B opens conversation → Frontend
  ↓
HTTP POST /api/v1/messages/:id/read (update database)
  ↓
MessageService.markAsRead() updates isReadByRecipient
  ↓
WebSocketService.broadcastToUser(senderId, {
  type: 'message_read',
  messageId: 123
})
  ↓
User A sees read receipt (✓✓) in real-time
```

#### Typing Indicator

```
User A types → Frontend
  ↓
WebSocket: { type: 'typing', conversationId: 1, userId: 1 }
  ↓
WebSocketService receives event
  ↓
WebSocketService.broadcastToUser(recipientId, {
  type: 'typing',
  conversationId: 1,
  userId: 1
})
  ↓
User B sees "User A is typing..." (3s timeout)
```

---

## Implementation Plan

### Phase 1: WebSocket Server Infrastructure

**Goal:** Set up WebSocket server with authentication and connection management

#### Step 1.1: Install Dependencies

**File:** `apps/api/package.json`

```bash
cd apps/api
npm install ws
npm install --save-dev @types/ws
```

#### Step 1.2: Create WebSocket Service

**File:** `apps/api/src/services/websocket.service.ts`

```typescript
import { WebSocket } from 'ws';
import { logger } from '../utils/logger';

interface WebSocketMessage {
  type: 'message' | 'message_read' | 'message_edited' | 'message_deleted' | 'typing' | 'ping' | 'pong';
  [key: string]: any;
}

class WebSocketService {
  private connections: Map<number, Set<WebSocket>> = new Map();
  private userSockets: Map<WebSocket, number> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add a WebSocket connection for a user
   */
  addConnection(userId: number, ws: WebSocket): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(ws);
    this.userSockets.set(ws, userId);

    logger.info(`User ${userId} connected via WebSocket`);

    // Set up message handler
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleIncomingMessage(userId, ws, message);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
      }
    });

    // Set up close handler
    ws.on('close', () => {
      this.removeConnection(ws);
    });

    // Set up error handler
    ws.on('error', (error) => {
      logger.error(`WebSocket error for user ${userId}:`, error);
      this.removeConnection(ws);
    });

    // Send connection confirmation
    this.sendToSocket(ws, { type: 'connected', userId });
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(ws: WebSocket): void {
    const userId = this.userSockets.get(ws);
    if (userId) {
      const userConnections = this.connections.get(userId);
      if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
          this.connections.delete(userId);
        }
      }
      this.userSockets.delete(ws);
      logger.info(`User ${userId} disconnected from WebSocket`);
    }
  }

  /**
   * Broadcast message to a specific user (all their connections)
   */
  broadcastToUser(userId: number, message: WebSocketMessage): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      logger.debug(`User ${userId} not connected, skipping broadcast`);
      return;
    }

    const messageStr = JSON.stringify(message);
    userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });

    logger.debug(`Broadcasted ${message.type} to user ${userId}`);
  }

  /**
   * Broadcast message to both users in a conversation
   */
  broadcastToConversation(userId1: number, userId2: number, message: WebSocketMessage): void {
    this.broadcastToUser(userId1, message);
    this.broadcastToUser(userId2, message);
  }

  /**
   * Handle incoming WebSocket messages from clients
   */
  private handleIncomingMessage(userId: number, ws: WebSocket, message: WebSocketMessage): void {
    switch (message.type) {
      case 'ping':
        this.sendToSocket(ws, { type: 'pong' });
        break;

      case 'typing':
        // Broadcast typing indicator to recipient
        if (message.recipientId) {
          this.broadcastToUser(message.recipientId, {
            type: 'typing',
            userId,
            conversationId: message.conversationId,
          });
        }
        break;

      default:
        logger.warn(`Unknown WebSocket message type: ${message.type}`);
    }
  }

  /**
   * Send message to a specific socket
   */
  private sendToSocket(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((sockets, userId) => {
        sockets.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          } else {
            this.removeConnection(ws);
          }
        });
      });
    }, 30000); // 30 seconds
  }

  /**
   * Check if user is currently online
   */
  isUserOnline(userId: number): boolean {
    const connections = this.connections.get(userId);
    return connections ? connections.size > 0 : false;
  }

  /**
   * Get count of active connections
   */
  getConnectionCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get count of online users
   */
  getOnlineUserCount(): number {
    return this.connections.size;
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.connections.forEach((sockets) => {
      sockets.forEach((ws) => ws.close());
    });
    this.connections.clear();
    this.userSockets.clear();
  }
}

export const websocketService = new WebSocketService();
```

#### Step 1.3: Upgrade HTTP Server to Support WebSocket

**File:** `apps/api/src/app.ts`

Add after Express app setup:

```typescript
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { verifyToken } from './middleware/auth.middleware';
import { websocketService } from './services/websocket.service';

// Create HTTP server
const httpServer = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server: httpServer,
  path: '/messages',
});

// WebSocket authentication and connection handling
wss.on('connection', async (ws, req) => {
  try {
    // Extract token from query string
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    // Verify JWT token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // Add connection to WebSocket service
    websocketService.addConnection(decoded.userId, ws);
  } catch (error) {
    logger.error('WebSocket connection error:', error);
    ws.close(1011, 'Authentication failed');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing WebSocket connections...');
  websocketService.shutdown();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Export httpServer instead of app for server.ts to use
export { httpServer };
```

#### Step 1.4: Update Server Entry Point

**File:** `apps/api/src/server.ts`

```typescript
import { httpServer } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`HTTP API: http://localhost:${PORT}/api/v1`);
  logger.info(`WebSocket: ws://localhost:${PORT}/messages`);
});
```

---

### Phase 2: Integrate WebSocket Broadcasting with Existing Services

**Goal:** Modify existing message service methods to broadcast WebSocket events

#### Step 2.1: Update Message Service

**File:** `apps/api/src/services/message.service.ts`

Add WebSocket broadcasting to existing methods:

```typescript
import { websocketService } from './websocket.service';

// In sendMessage() method, after creating message:
const message = await this.messageRepository.create(messageData);
const response = await this.mapToMessageResponse(message);

// Broadcast to recipient
websocketService.broadcastToUser(dto.recipientId, {
  type: 'message',
  message: response,
});

return { success: true, data: response };

// In markAsRead() method, after marking as read:
await this.messageRepository.markAsRead(messageId, userId);

// Broadcast read receipt to sender
const message = await this.messageRepository.findById(messageId);
if (message) {
  websocketService.broadcastToUser(message.senderId, {
    type: 'message_read',
    messageId,
    readAt: new Date(),
  });
}

// In updateMessage() method, after updating:
const updated = await this.messageRepository.update(messageId, updates);
const response = await this.mapToMessageResponse(updated);

// Broadcast to both parties
websocketService.broadcastToConversation(
  response.senderId,
  response.recipientId,
  {
    type: 'message_edited',
    message: response,
  }
);

// In deleteMessage() method, after soft delete:
await this.messageRepository.softDelete(messageId, userId);

const message = await this.messageRepository.findById(messageId);
if (message) {
  websocketService.broadcastToConversation(
    message.senderId,
    message.recipientId,
    {
      type: 'message_deleted',
      messageId,
    }
  );
}
```

#### Step 2.2: Add Online Status to Conversation DTOs

**File:** `apps/api/src/services/message.service.ts`

Update `mapToConversationPreview()`:

```typescript
private mapToConversationPreview(data: any): ConversationPreviewDTO {
  return {
    userId: data.userId,
    fullName: data.fullName,
    profilePictureUrl: data.profilePictureUrl,
    lastMessage: data.lastMessage,
    lastMessageAt: data.lastMessageAt,
    lastMessageSenderId: data.lastMessageSenderId,
    unreadCount: data.unreadCount,
    isOnline: websocketService.isUserOnline(data.userId), // NEW
    postId: data.postId,
    postTitle: data.postTitle,
  };
}
```

---

### Phase 3: Configuration and Environment

#### Step 3.1: Update Backend Environment Variables

**File:** `apps/api/.env`

```env
# Existing variables...

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS_PER_USER=5
```

#### Step 3.2: Update Frontend Environment Variables

**File:** `apps/web/.env`

```env
# Existing variables...

# WebSocket Configuration
VITE_WS_URL=ws://localhost:3000
```

**File:** `apps/web/.env.production`

```env
VITE_WS_URL=wss://api.regoods.com
```

---

### Phase 4: Testing and Monitoring

#### Step 4.1: Create WebSocket Integration Tests

**File:** `apps/api/src/__tests__/websocket.test.ts`

```typescript
import WebSocket from 'ws';
import { createServer } from 'http';
import { app } from '../app';
import { generateToken } from '../utils/jwt';

describe('WebSocket Integration', () => {
  let httpServer: any;
  let wsUrl: string;

  beforeAll(async () => {
    httpServer = createServer(app);
    await new Promise((resolve) => httpServer.listen(0, resolve));
    const port = httpServer.address().port;
    wsUrl = `ws://localhost:${port}/messages`;
  });

  afterAll(() => {
    httpServer.close();
  });

  it('should connect with valid token', async () => {
    const token = generateToken({ userId: 1 });
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    await new Promise((resolve) => {
      ws.on('open', resolve);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('should reject connection without token', async () => {
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve) => {
      ws.on('close', resolve);
    });

    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });

  it('should receive message broadcast', async () => {
    const token = generateToken({ userId: 1 });
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    await new Promise((resolve) => ws.on('open', resolve));

    const messagePromise = new Promise((resolve) => {
      ws.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    // Trigger message send via API
    // ... (use supertest to POST message)

    const message = await messagePromise;
    expect(message.type).toBe('message');

    ws.close();
  });
});
```

#### Step 4.2: Add WebSocket Monitoring

**File:** `apps/api/src/routes/health.routes.ts`

```typescript
router.get('/websocket-stats', (req, res) => {
  res.json({
    activeConnections: websocketService.getConnectionCount(),
    onlineUsers: websocketService.getOnlineUserCount(),
  });
});
```

---

## Migration Checklist

### Pre-Migration

- [ ] Review current messaging load and traffic patterns
- [ ] Set up monitoring for WebSocket connections
- [ ] Prepare rollback plan
- [ ] Test in development environment
- [ ] Test in staging environment

### Migration Steps

- [ ] Deploy backend with WebSocket server (keep REST API active)
- [ ] Update frontend environment variables (`VITE_WS_URL`)
- [ ] Deploy frontend with WebSocket connection enabled
- [ ] Monitor WebSocket connection success rate
- [ ] Monitor message delivery latency
- [ ] Verify read receipts and typing indicators work

### Post-Migration

- [ ] Monitor error logs for WebSocket issues
- [ ] Track WebSocket connection count and stability
- [ ] Verify database queries haven't changed (only additions)
- [ ] Collect user feedback on real-time messaging
- [ ] Optimize if latency issues observed

---

## Rollback Plan

If WebSocket implementation causes issues:

1. **Frontend Rollback**: Set `VITE_WS_URL=` (empty) to disable WebSocket connection
2. **Backend Rollback**: Remove WebSocket server initialization, messages still work via REST API
3. **Database**: No changes needed (schema unchanged)

The system will fall back to HTTP polling behavior without data loss.

---

## Performance Considerations

### Connection Management

- **Max connections per user**: 5 (multiple devices/tabs)
- **Heartbeat interval**: 30 seconds (match frontend)
- **Idle timeout**: 5 minutes of inactivity
- **Reconnection delay**: 3 seconds (frontend handles)

### Broadcasting Optimization

- **Direct user broadcast**: O(1) lookup by userId
- **Conversation broadcast**: 2 broadcasts (sender + recipient)
- **Skip offline users**: No queuing (messages delivered via REST API on next fetch)

### Load Testing Targets

- **Concurrent connections**: 10,000 users
- **Messages per second**: 1,000 msgs/sec
- **Memory per connection**: ~10KB
- **Expected memory**: ~100MB for 10K connections

---

## Scaling Strategy

### Option 1: Redis Pub/Sub (Recommended)

For horizontal scaling with multiple backend instances:

**Install:**
```bash
npm install redis
npm install --save-dev @types/redis
```

**Implementation:**

```typescript
// apps/api/src/services/redis-pubsub.service.ts
import { createClient } from 'redis';

class RedisPubSubService {
  private publisher: any;
  private subscriber: any;

  async initialize() {
    this.publisher = createClient({ url: process.env.REDIS_URL });
    this.subscriber = createClient({ url: process.env.REDIS_URL });

    await this.publisher.connect();
    await this.subscriber.connect();

    // Subscribe to message channel
    await this.subscriber.subscribe('messages', (message) => {
      const data = JSON.parse(message);
      websocketService.broadcastToUser(data.userId, data.payload);
    });
  }

  async publish(userId: number, payload: any) {
    await this.publisher.publish('messages', JSON.stringify({ userId, payload }));
  }
}
```

**Update WebSocketService:**

```typescript
// Instead of direct broadcast:
websocketService.broadcastToUser(userId, message);

// Use Redis:
redisPubSubService.publish(userId, message);
// All backend instances receive and broadcast to their connected users
```

### Option 2: Socket.IO (Alternative)

Consider migrating to Socket.IO for built-in features:

- **Built-in Redis adapter** for scaling
- **Room support** for group messaging
- **Automatic reconnection** and fallbacks
- **Binary data support** for file transfers

**Trade-off:** Larger bundle size, different API

---

## Security Considerations

### Authentication

- ✅ JWT token required in query string: `?token=<jwt>`
- ✅ Token verified before accepting connection
- ✅ UserId extracted from token (not client-provided)

### Authorization

- ✅ Users can only send to/receive from conversations they're part of
- ✅ Backend validates message ownership before broadcasting
- ✅ Cannot send messages to blocked users (if blocking feature exists)

### Rate Limiting

Add rate limiting to WebSocket events:

```typescript
// In WebSocketService
private rateLimiters: Map<number, { count: number; resetAt: number }> = new Map();

private checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const limiter = this.rateLimiters.get(userId);

  if (!limiter || now > limiter.resetAt) {
    this.rateLimiters.set(userId, { count: 1, resetAt: now + 60000 }); // 1 min window
    return true;
  }

  if (limiter.count >= 100) { // 100 messages per minute
    return false;
  }

  limiter.count++;
  return true;
}
```

### Input Validation

- ✅ Message content sanitized in existing service layer
- ✅ XSS prevention via content encoding
- ✅ File upload validation (type, size) in existing code

---

## Monitoring and Observability

### Metrics to Track

```typescript
// In WebSocketService
getMetrics() {
  return {
    activeConnections: this.getConnectionCount(),
    onlineUsers: this.getOnlineUserCount(),
    messagesSent: this.messagesSentCount,
    messagesReceived: this.messagesReceivedCount,
    connectionErrors: this.connectionErrorCount,
    avgConnectionDuration: this.calculateAvgDuration(),
  };
}
```

### Logging

Add structured logging:

```typescript
logger.info('WebSocket event', {
  type: 'message_broadcast',
  userId,
  messageId,
  recipientId,
  timestamp: new Date().toISOString(),
});
```

### Alerts

Set up alerts for:

- WebSocket connection failures > 5%
- Average message latency > 500ms
- Connection count drops > 20% suddenly
- Memory usage > 80%

---

## Future Enhancements

### Phase 5: Group Messaging (Future)

- Create `Conversation` table linking multiple users
- Update WebSocket broadcasting to support rooms
- Frontend UI for group chat creation

### Phase 6: Voice/Video Calls (Future)

- Integrate WebRTC for peer-to-peer calls
- Use WebSocket for signaling (offer/answer/ICE candidates)
- Add call history to database

### Phase 7: Message Reactions (Future)

- Add `MessageReaction` table
- Broadcast reaction events via WebSocket
- Update frontend to display reactions

### Phase 8: E2E Encryption (Future)

- Implement end-to-end encryption for messages
- Store encrypted content in database
- Exchange keys via WebSocket (Signal protocol)

---

## Summary

| Phase                      | Effort | Dependencies              | Status    |
| -------------------------- | ------ | ------------------------- | --------- |
| WebSocket Server Setup     | 2 days | `ws` library, auth        | 📋 Planned |
| Message Broadcasting       | 1 day  | WebSocket service         | 📋 Planned |
| Testing & Monitoring       | 1 day  | Integration tests         | 📋 Planned |
| Configuration & Deployment | 1 day  | Environment setup         | 📋 Planned |
| **Total Estimated Time**   | **5 days** |                       |           |

### Key Benefits

- ✅ **Real-time messaging**: Instant message delivery without polling
- ✅ **Read receipts**: Sender sees when recipient reads message
- ✅ **Typing indicators**: Show when other user is typing
- ✅ **Online status**: See who's currently online
- ✅ **Better UX**: No page refresh needed for new messages
- ✅ **Reduced load**: No HTTP polling (less database queries)
- ✅ **Scalable**: Ready for Redis pub/sub when needed

### Risks and Mitigations

| Risk                        | Mitigation                                   |
| --------------------------- | -------------------------------------------- |
| WebSocket connection issues | Graceful fallback to REST API (existing)     |
| Scaling with multiple nodes | Implement Redis pub/sub (Phase 5)           |
| Memory leaks from orphaned connections | Heartbeat cleanup + timeout handling   |
| Message delivery failures   | Persist all messages via REST API first      |
| Frontend compatibility      | Frontend already built and tested            |

---

**Next Steps:**

1. Review and approve this plan
2. Set up development environment with WebSocket testing
3. Begin Phase 1 implementation
4. Set up staging environment for testing
5. Plan production deployment window

---

**References:**

- [Frontend Message Service](apps/web/src/lib/services/message.service.ts)
- [Frontend Message Store](apps/web/src/lib/stores/message.store.ts)
- [Backend Message Service](apps/api/src/services/message.service.ts)
- [Message Implementation Plan](MESSAGE_SERVICE_IMPLEMENTATION.md)
- [Message Controller Plan](MESSAGE_CONTROLLER_IMPLEMENTATION_PLAN.md)

**Last Updated:** January 6, 2026  
**Version:** 1.0.0  
**Author:** ReGoods Development Team
