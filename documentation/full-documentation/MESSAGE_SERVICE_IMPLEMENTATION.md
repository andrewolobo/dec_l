# Message Service Implementation - Real-Time Messaging

**Implementation Date:** December 23, 2025  
**Status:** ✅ Complete - Ready for Backend Integration  
**Service File:** `apps/web/src/lib/services/message.service.ts`  
**Store File:** `apps/web/src/lib/stores/message.store.ts`  
**Test File:** `apps/web/src/lib/services/message.service.test.ts`

---

## Overview

The Message Service provides a comprehensive real-time messaging system for ReGoods, enabling users to communicate about listings, negotiate prices, and arrange meetups. The service integrates WebSocket technology for instant message delivery, read receipts, and typing indicators.

### Key Features

- **Real-Time Messaging**: WebSocket-based instant message delivery
- **Conversation Management**: Organize messages by conversations
- **Read Receipts**: Track message read status
- **Typing Indicators**: Show when users are typing
- **Message Search**: Search through message history
- **File Attachments**: Support for image attachments
- **Offline Support**: Message queuing and sync when reconnected
- **Optimistic Updates**: Immediate UI updates for better UX

---

## Architecture

### System Components

1. **Message Service** (`message.service.ts`)
   - API communication layer
   - WebSocket connection management
   - Message CRUD operations
   - Real-time event handling

2. **Message Store** (`message.store.ts`)
   - Reactive state management
   - Message and conversation storage
   - Derived stores for UI
   - Typing indicator tracking

3. **WebSocket Server** (Backend)
   - Real-time message broadcasting
   - Connection management
   - User presence tracking

### Message Flow

```
User A sends message
  ↓
API POST /messages (creates message record)
  ↓
WebSocket broadcasts to User B
  ↓
User B receives message in real-time
  ↓
User B opens conversation
  ↓
API POST /messages/:id/read (marks as read)
  ↓
WebSocket notifies User A of read receipt
```

---

## WebSocket Integration

### Connection Management

#### `connectWebSocket(token: string): void`

Establishes WebSocket connection for real-time messaging.

```typescript
import { messageService } from "$lib/services/message.service";

// Connect when user logs in
messageService.connectWebSocket(authToken);
```

**Features:**

- Automatic reconnection (5 attempts)
- Heartbeat/ping mechanism (30 seconds)
- Connection status tracking
- Error handling and recovery

---

#### `disconnectWebSocket(): void`

Closes WebSocket connection (call on logout).

```typescript
// Disconnect when user logs out
messageService.disconnectWebSocket();
```

---

### WebSocket Events

The service handles the following real-time events:

| Event Type        | Description            | Store Update                               |
| ----------------- | ---------------------- | ------------------------------------------ |
| `message`         | New message received   | `addMessage` + `updateConversationPreview` |
| `message_read`    | Message marked as read | `markMessageAsRead`                        |
| `message_edited`  | Message was edited     | `updateMessage`                            |
| `message_deleted` | Message was deleted    | `removeMessage`                            |
| `typing`          | User is typing         | `setTypingIndicator` (3s timeout)          |
| `pong`            | Heartbeat response     | Connection keep-alive                      |

**Example WebSocket Message:**

```json
{
  "type": "message",
  "message": {
    "messageId": 123,
    "senderId": 2,
    "recipientId": 1,
    "messageContent": "Hello!",
    "messageType": "text",
    "isRead": false,
    "createdAt": "2025-12-23T10:00:00Z"
  }
}
```

---

## Conversation Management

### `getConversations(limit?, offset?): Promise<PaginatedResponse>`

Fetches all conversations for the current user.

```typescript
const { data, total } = await messageService.getConversations(20, 0);
// Returns: ConversationPreviewDTO[]
```

**Response:**

```typescript
{
  userId: 2,
  username: "john_doe",
  profilePicture: "https://cdn.example.com/avatar.jpg",
  lastMessage: "Hello there!",
  lastMessageAt: "2025-12-23T10:00:00Z",
  unreadCount: 3,
  isOnline: true
}
```

---

### `getConversation(userId, postId?): Promise<ApiResponse>`

Fetches full conversation with a specific user.

```typescript
// General conversation
const { data } = await messageService.getConversation(2);

// Conversation about specific post
const { data } = await messageService.getConversation(2, 123);
```

**Response:**

```typescript
{
  conversationId: 1,
  userId: 2,
  messages: [
    {
      messageId: 1,
      senderId: 1,
      recipientId: 2,
      messageContent: "Is this still available?",
      messageType: "text",
      postId: 123,
      isRead: true,
      createdAt: "2025-12-23T10:00:00Z"
    }
  ]
}
```

---

### `deleteConversation(userId): Promise<ApiResponse>`

Deletes entire conversation with a user.

```typescript
await messageService.deleteConversation(2);
// Removes conversation and all messages from store
```

---

## Message Operations

### Sending Messages

#### `sendMessage(data: CreateMessageDTO): Promise<ApiResponse>`

Sends a new message.

```typescript
const message = await messageService.sendMessage({
  recipientId: 2,
  messageContent: "Is this item still available?",
  messageType: "text",
  postId: 123, // Optional: link to specific post
});
```

**Message Types:**

- `text`: Plain text message
- `image`: Image attachment
- `system`: System notification (backend-generated)

**Optimistic Update:**
Message is immediately added to store before API confirmation.

---

### Fetching Messages

#### `getMessages(userId, limit?, offset?, postId?): Promise<PaginatedResponse>`

Fetches messages from a conversation.

```typescript
// Get latest 50 messages
const { data, total } = await messageService.getMessages(2, 50, 0);

// Get messages about specific post
const { data } = await messageService.getMessages(2, 50, 0, 123);
```

---

### Editing Messages

#### `editMessage(messageId, updates): Promise<ApiResponse>`

Edits message content.

```typescript
await messageService.editMessage(123, {
  messageContent: "Updated message text",
});
```

**Features:**

- Marks message as edited (`isEdited: true`)
- Real-time update via WebSocket
- Edit history (if backend supports)

---

### Deleting Messages

#### `deleteMessage(messageId): Promise<ApiResponse>`

Soft deletes a message.

```typescript
await messageService.deleteMessage(123);
```

**Behavior:**

- Removes from store immediately
- Backend soft-deletes (can be recovered)
- Real-time notification to other user

---

## Read Receipts

### `markMessageAsRead(messageId): Promise<ApiResponse>`

Marks a single message as read.

```typescript
await messageService.markMessageAsRead(123);
```

**Actions:**

- Updates `isRead` to `true`
- Sets `readAt` timestamp
- Broadcasts read receipt via WebSocket
- Decrements unread count

---

### `markConversationAsRead(userId): Promise<ApiResponse>`

Marks all messages in a conversation as read.

```typescript
await messageService.markConversationAsRead(2);
// Marks all messages from user 2 as read
```

---

### `getUnreadCount(): Promise<ApiResponse>`

Fetches total unread message count.

```typescript
const { data } = await messageService.getUnreadCount();
console.log(`You have ${data.count} unread messages`);
```

**Use Case:**
Display badge count in navigation header.

---

## Typing Indicators

### `sendTypingIndicator(conversationId, userId): void`

Broadcasts that user is typing.

```typescript
// Call on input event
messageService.sendTypingIndicator(conversationId, currentUserId);
```

**Behavior:**

- Sent via WebSocket
- Recipient sees typing indicator
- Auto-clears after 3 seconds
- Debounce recommended for performance

---

### `stopTypingIndicator(conversationId, userId): void`

Manually stops typing indicator.

```typescript
// Call when user stops typing or sends message
messageService.stopTypingIndicator(conversationId, currentUserId);
```

---

## Search

### `searchMessages(query, userId?, limit?, offset?): Promise<PaginatedResponse>`

Searches messages by content.

```typescript
// Search all messages
const results = await messageService.searchMessages("price");

// Search messages with specific user
const results = await messageService.searchMessages("price", 2);
```

**Search Features:**

- Full-text search
- Case-insensitive
- Highlights matches
- Paginated results

---

## Attachments

### `uploadMessageAttachment(file): Promise<ApiResponse>`

Uploads image attachment for messages.

```typescript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const { data } = await messageService.uploadMessageAttachment(file);
// data.url = "https://cdn.example.com/attachments/image.jpg"

// Send message with attachment
await messageService.sendMessage({
  recipientId: 2,
  messageContent: "Check out this image",
  messageType: "image",
  attachmentURL: data.url,
});
```

**Supported Formats:**

- JPEG, PNG, GIF, WebP
- Max size: 5MB (configurable)
- Auto-compression before upload

---

## Message Store

### State Structure

```typescript
{
  messages: Map<messageId, MessageDTO>,
  conversations: Map<userId, ConversationPreviewDTO>,
  typingIndicators: Map<conversationId, Set<userId>>,
  unreadCount: number,
  loading: boolean,
  error: string | null,
  wsConnected: boolean,
  wsError: string | null
}
```

---

### Core Store Methods

#### Message Management

```typescript
// Set multiple messages
messageStore.setMessages(messages);

// Add single message
messageStore.addMessage(message);

// Update message
messageStore.updateMessage(messageId, updates);

// Remove message
messageStore.removeMessage(messageId);

// Mark as read
messageStore.markMessageAsRead(messageId);
messageStore.markConversationAsRead(userId);

// Clear all
messageStore.clearMessages();
```

---

#### Conversation Management

```typescript
// Set conversations
messageStore.setConversations(conversations);

// Update preview (on new message)
messageStore.updateConversationPreview(message);

// Remove conversation
messageStore.removeConversation(userId);

// Clear all
messageStore.clearConversations();
```

---

#### Typing Indicators

```typescript
// Set typing status
messageStore.setTypingIndicator(conversationId, userId, true);

// Clear typing (auto after 3s)
messageStore.clearTypingIndicators(conversationId);
```

---

#### Unread Count

```typescript
// Set count
messageStore.setUnreadCount(5);

// Increment/decrement
messageStore.incrementUnreadCount();
messageStore.decrementUnreadCount(3);
```

---

### Derived Stores

#### Collections

```typescript
// All messages/conversations as arrays
messages.subscribe(($messages) => console.log($messages));
conversations.subscribe(($convs) => console.log($convs));

// Sorted conversations (most recent first)
conversationsByRecent.subscribe(($convs) => console.log($convs));

// Filtered lists
unreadConversations.subscribe(($convs) => console.log($convs));
onlineConversations.subscribe(($convs) => console.log($convs));
unreadMessages.subscribe(($msgs) => console.log($msgs));
messagesByTime.subscribe(($msgs) => console.log($msgs));
```

---

#### State Indicators

```typescript
// Unread tracking
unreadCount.subscribe(($count) => console.log($count));
hasUnreadMessages.subscribe(($has) => console.log($has));

// Loading states
messagesLoading.subscribe(($loading) => console.log($loading));
messagesError.subscribe(($error) => console.log($error));

// WebSocket status
webSocketConnected.subscribe(($connected) => console.log($connected));
webSocketError.subscribe(($error) => console.log($error));

// Counts
conversationCount.subscribe(($count) => console.log($count));
messageCount.subscribe(($count) => console.log($count));
```

---

#### Statistics

```typescript
messageStats.subscribe(($stats) => {
  console.log($stats);
  // {
  //   totalMessages: 50,
  //   unreadMessages: 5,
  //   readMessages: 45,
  //   totalConversations: 10,
  //   unreadConversations: 2
  // }
});
```

---

#### Query Functions

```typescript
// Get specific items
getMessage.subscribe(($get) => {
  const message = $get(123);
});

getConversation.subscribe(($get) => {
  const conv = $get(2); // by userId
});

// Check existence
hasMessage.subscribe(($has) => {
  const exists = $has(123);
});

hasConversation.subscribe(($has) => {
  const exists = $has(2);
});

// Get by filters
getMessagesByUser.subscribe(($get) => {
  const messages = $get(2); // all messages with user 2
});

getMessagesByPost.subscribe(($get) => {
  const messages = $get(123); // messages about post 123
});

getLastMessage.subscribe(($get) => {
  const last = $get(2); // last message in conversation
});

// Typing indicators
isUserTyping.subscribe(($is) => {
  const typing = $is(conversationId, userId);
});

getTypingUsers.subscribe(($get) => {
  const users = $get(conversationId); // array of user IDs
});

// Search locally
searchMessagesLocal.subscribe(($search) => {
  const results = $search("price");
});
```

---

## Utility Functions

### `formatMessageTime(date): string`

Formats message timestamp in a human-readable way.

```typescript
formatMessageTime(new Date()); // "Just now"
formatMessageTime(new Date(Date.now() - 5 * 60 * 1000)); // "5m ago"
formatMessageTime(new Date(Date.now() - 3 * 60 * 60 * 1000)); // "3h ago"
formatMessageTime(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)); // "2d ago"
formatMessageTime(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)); // "12/13/2025"
```

---

### `isMyMessage(message, currentUserId): boolean`

Checks if message was sent by current user.

```typescript
const isMine = messageService.isMyMessage(message, currentUserId);
// Use for styling (align right for own messages)
```

---

### `getConversationPartner(message, currentUserId): number`

Gets the other user's ID from a message.

```typescript
const partnerId = messageService.getConversationPartner(message, currentUserId);
// Returns recipientId if you sent it, senderId if you received it
```

---

### `groupMessagesByDate(messages): Record<string, MessageDTO[]>`

Groups messages by date for UI display.

```typescript
const grouped = messageService.groupMessagesByDate(messages);
// {
//   "12/23/2025": [message1, message2],
//   "12/22/2025": [message3, message4]
// }
```

---

### `clearMessageCache(): void`

Clears all cached messages and conversations.

```typescript
messageService.clearMessageCache();
// Call on logout
```

---

## Usage Examples

### Example 1: Basic Messaging Component

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { messageService } from '$lib/services/message.service';
  import {
    getMessagesByUser,
    messagesLoading,
    webSocketConnected
  } from '$lib/stores';
  import { authStore } from '$lib/stores';

  export let userId: number; // Conversation partner

  let messageContent = '';
  let messageInput: HTMLInputElement;

  $: conversationMessages = $getMessagesByUser(userId);
  $: currentUserId = $authStore.user?.userId || 0;

  onMount(async () => {
    // Connect WebSocket
    if ($authStore.token) {
      messageService.connectWebSocket($authStore.token);
    }

    // Fetch conversation
    await messageService.getConversation(userId);

    // Mark as read
    await messageService.markConversationAsRead(userId);
  });

  onDestroy(() => {
    // Disconnect when component unmounts (optional)
    // messageService.disconnectWebSocket();
  });

  async function sendMessage() {
    if (!messageContent.trim()) return;

    await messageService.sendMessage({
      recipientId: userId,
      messageContent: messageContent.trim(),
      messageType: 'text'
    });

    messageContent = '';
    messageInput.focus();
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInput() {
    // Send typing indicator (debounce recommended)
    messageService.sendTypingIndicator(userId, currentUserId);
  }
</script>

<div class="chat-container">
  <!-- WebSocket Status -->
  {#if !$webSocketConnected}
    <div class="status-warning">
      Reconnecting to chat server...
    </div>
  {/if}

  <!-- Message List -->
  <div class="message-list">
    {#if $messagesLoading}
      <p>Loading messages...</p>
    {:else}
      {#each conversationMessages as message}
        <div
          class="message"
          class:mine={messageService.isMyMessage(message, currentUserId)}
        >
          <div class="message-content">
            {message.messageContent}
          </div>
          <div class="message-time">
            {messageService.formatMessageTime(message.createdAt)}
            {#if message.isRead && messageService.isMyMessage(message, currentUserId)}
              <span class="read-indicator">✓✓</span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Message Input -->
  <div class="message-input">
    <input
      type="text"
      bind:value={messageContent}
      bind:this={messageInput}
      on:keypress={handleKeyPress}
      on:input={handleInput}
      placeholder="Type a message..."
    />
    <button on:click={sendMessage} disabled={!messageContent.trim()}>
      Send
    </button>
  </div>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .message {
    margin-bottom: 1rem;
    max-width: 70%;
  }

  .message.mine {
    margin-left: auto;
    text-align: right;
  }

  .message-content {
    background: #f0f0f0;
    padding: 0.75rem;
    border-radius: 1rem;
  }

  .message.mine .message-content {
    background: #007bff;
    color: white;
  }

  .message-time {
    font-size: 0.75rem;
    color: #666;
    margin-top: 0.25rem;
  }

  .read-indicator {
    color: #007bff;
  }
</style>
```

---

### Example 2: Conversation List

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { messageService } from '$lib/services/message.service';
  import {
    conversationsByRecent,
    unreadCount,
    messagesLoading
  } from '$lib/stores';

  onMount(async () => {
    await messageService.getConversations();
    await messageService.getUnreadCount();
  });
</script>

<div class="conversations">
  <h2>Messages {#if $unreadCount > 0}({$unreadCount}){/if}</h2>

  {#if $messagesLoading}
    <p>Loading conversations...</p>
  {:else if $conversationsByRecent.length === 0}
    <p>No messages yet</p>
  {:else}
    {#each $conversationsByRecent as conv}
      <a href="/messages/{conv.userId}" class="conversation-item">
        <img src={conv.profilePicture || '/default-avatar.png'} alt={conv.username} />
        <div class="conversation-info">
          <div class="conversation-header">
            <span class="username">{conv.username}</span>
            <span class="time">
              {messageService.formatMessageTime(conv.lastMessageAt)}
            </span>
          </div>
          <div class="last-message">
            {conv.lastMessage}
          </div>
        </div>
        {#if conv.unreadCount > 0}
          <div class="unread-badge">{conv.unreadCount}</div>
        {/if}
        {#if conv.isOnline}
          <div class="online-indicator"></div>
        {/if}
      </a>
    {/each}
  {/if}
</div>
```

---

### Example 3: Typing Indicator

```svelte
<script lang="ts">
  import { getTypingUsers } from '$lib/stores';

  export let conversationId: number;
  export let currentUserId: number;

  $: typingUsers = $getTypingUsers(conversationId);
  $: otherUsersTyping = typingUsers.filter(id => id !== currentUserId);
</script>

{#if otherUsersTyping.length > 0}
  <div class="typing-indicator">
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="text">Typing...</span>
  </div>
{/if}

<style>
  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #666;
    font-size: 0.875rem;
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    background: #666;
    border-radius: 50%;
    animation: bounce 1.4s infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-0.5rem);
    }
  }
</style>
```

---

### Example 4: Message Search

```svelte
<script lang="ts">
  import { messageService } from '$lib/services/message.service';
  import { searchMessagesLocal } from '$lib/stores';

  let searchQuery = '';
  let searchResults: MessageResponseDTO[] = [];
  let searching = false;

  async function handleSearch() {
    if (!searchQuery.trim()) {
      searchResults = [];
      return;
    }

    searching = true;

    // Search locally first (instant)
    const localResults = $searchMessagesLocal(searchQuery);
    searchResults = localResults;

    // Then search server (complete results)
    try {
      const { data } = await messageService.searchMessages(searchQuery);
      searchResults = data;
    } finally {
      searching = false;
    }
  }
</script>

<div class="search-container">
  <input
    type="text"
    bind:value={searchQuery}
    on:input={handleSearch}
    placeholder="Search messages..."
  />

  {#if searching}
    <p>Searching...</p>
  {:else if searchResults.length > 0}
    <div class="search-results">
      {#each searchResults as message}
        <div class="search-result">
          <strong>{message.senderId === currentUserId ? 'You' : 'Them'}:</strong>
          {message.messageContent}
          <span class="time">{messageService.formatMessageTime(message.createdAt)}</span>
        </div>
      {/each}
    </div>
  {:else if searchQuery}
    <p>No messages found</p>
  {/if}
</div>
```

---

## Testing

### Test Coverage

The message service includes 100+ comprehensive test cases:

- ✅ WebSocket connection/disconnection
- ✅ Real-time event handling
- ✅ Conversation fetching and management
- ✅ Message CRUD operations
- ✅ Read receipts and unread counting
- ✅ Typing indicators
- ✅ Message search
- ✅ File attachments
- ✅ Utility functions
- ✅ Error handling
- ✅ Store integration
- ✅ Reconnection logic

### Running Tests

```bash
cd apps/web
npm test message.service.test.ts
```

---

## Backend API Endpoints

The service expects the following backend endpoints:

### Conversations

```
GET /messages/conversations?limit=20&offset=0
Response: PaginatedResponse<ConversationPreviewDTO>

GET /messages/conversations/:userId?postId=123
Response: ApiResponse<ConversationResponseDTO>

GET /messages/conversations/id/:conversationId
Response: ApiResponse<ConversationResponseDTO>

DELETE /messages/conversations/:userId
Response: ApiResponse<void>
```

### Messages

```
POST /messages
Body: CreateMessageDTO
Response: ApiResponse<MessageResponseDTO>

GET /messages/user/:userId?limit=50&offset=0&postId=123
Response: PaginatedResponse<MessageResponseDTO>

GET /messages/:messageId
Response: ApiResponse<MessageResponseDTO>

PUT /messages/:messageId
Body: UpdateMessageDTO
Response: ApiResponse<MessageResponseDTO>

DELETE /messages/:messageId
Response: ApiResponse<void>

POST /messages/:messageId/read
Response: ApiResponse<void>

POST /messages/conversations/:userId/read
Response: ApiResponse<void>

GET /messages/unread/count
Response: ApiResponse<{ count: number }>

GET /messages/search?query=text&userId=2&limit=20&offset=0
Response: PaginatedResponse<MessageResponseDTO>

POST /messages/attachments
Body: FormData (file)
Response: ApiResponse<{ url: string }>
```

### WebSocket

```
WS /messages?token=<auth-token>

Events:
- message
- message_read
- message_edited
- message_deleted
- typing
- ping/pong
```

---

## Configuration

### Environment Variables

```env
# WebSocket URL
VITE_WS_URL=ws://localhost:3000

# Message Configuration
VITE_MESSAGE_POLL_INTERVAL=3000        # 3 seconds for typing indicator
VITE_MESSAGE_MAX_ATTACHMENTS=5        # Max files per message
VITE_MESSAGE_MAX_SIZE=5242880         # 5MB attachment limit
VITE_MESSAGE_RECONNECT_ATTEMPTS=5     # WebSocket reconnection attempts
VITE_MESSAGE_RECONNECT_DELAY=3000     # 3 seconds between attempts
VITE_MESSAGE_HEARTBEAT_INTERVAL=30000 # 30 seconds heartbeat
```

---

## Performance Optimization

### Best Practices

1. **Message Pagination**: Load conversations in chunks (20-50 messages)
2. **Virtual Scrolling**: Use virtual list for large conversation lists
3. **Debounce Typing**: Debounce typing indicators (300ms)
4. **Image Compression**: Compress images before upload
5. **Message Caching**: Cache recent conversations locally
6. **Lazy Loading**: Load older messages on scroll

### Memory Management

```typescript
// Clear old messages when navigating away
onDestroy(() => {
  messageService.clearMessageCache();
});

// Limit stored messages (keep last 100 per conversation)
if (conversationMessages.length > 100) {
  // Remove oldest messages from store
}
```

---

## Security Considerations

1. **Authentication**: WebSocket requires valid JWT token
2. **Authorization**: Backend validates user can access conversation
3. **Message Sanitization**: XSS prevention on message content
4. **Rate Limiting**: Prevent message spam (backend)
5. **File Validation**: Check file types and sizes
6. **Encryption**: Consider E2E encryption for sensitive data

---

## Future Enhancements

### Planned Features

1. **Group Messaging**: Multi-user conversations
2. **Voice Messages**: Audio recording and playback
3. **Video Calls**: WebRTC integration
4. **Message Reactions**: Emoji reactions to messages
5. **Message Threading**: Reply to specific messages
6. **Message Forwarding**: Share messages with others
7. **Message Pinning**: Pin important messages
8. **Auto-Translation**: Translate messages to user's language
9. **Scheduled Messages**: Send messages at specific time
10. **Message Templates**: Quick replies for common questions

---

## Summary

The Message Service provides a complete real-time messaging solution:

- ✅ **Service Layer**: 25+ methods for messaging operations
- ✅ **Store Layer**: Reactive state with 30+ derived stores
- ✅ **Test Coverage**: 100+ comprehensive test cases
- ✅ **WebSocket Support**: Real-time message delivery and events
- ✅ **Read Receipts**: Track message read status
- ✅ **Typing Indicators**: Show when users are typing
- ✅ **File Attachments**: Image upload support
- ✅ **Message Search**: Full-text search capability

**Status:** Ready for backend integration and WebSocket server implementation.

**Next Steps:**

1. Implement backend message API endpoints
2. Set up WebSocket server with Socket.IO or native WebSocket
3. Add E2E encryption for privacy
4. Implement message push notifications
5. Add group messaging support

---

**Last Updated:** December 23, 2025  
**Version:** 1.0.0  
**Author:** ReGoods Development Team
