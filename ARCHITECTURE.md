# Architecture — my-portfolio-back

## Overview

A single-server **Express + TypeScript** application that exposes:
- A **REST API** for all data operations
- A **Socket.IO WebSocket server** for real-time chat (shares the same HTTP port)

Both are mounted on a single `http.Server` instance created in `server.ts`.

---

## Server Bootstrap

```
server.ts
│
├── dotenv.config()               ← load env vars FIRST
├── connectDB()                   ← wait for MongoDB to connect
│   └── http.createServer(app)    ← wrap Express in Node HTTP server
│       ├── initSocket(httpServer) ← attach Socket.IO
│       └── httpServer.listen()   ← start listening
```

> **Why wrap in `http.Server`?**
> Socket.IO requires a raw Node.js `http.Server`, not just an Express app.
> Both REST and WebSocket traffic share the same port this way.

---

## Request Lifecycle (REST)

```
Client
  │
  ▼
Express app (app.ts)
  ├── cors()                    ← allow tuhindev.me + localhost:3000
  ├── express.json()
  ├── express.urlencoded()
  └── /api → apiLimiter (50 req/15 min)
               └── routes/index.ts
                     ├── /ping
                     ├── /users
                     ├── /project
                     ├── /chat
                     ├── /file
                     ├── /dashboard
                     └── /reviews
```

---

## Request Lifecycle (WebSocket)

```
Client (socket.io-client)
  │
  ├── handshake: { auth: { token: "<JWT>" } }
  │
  ▼
Socket.IO server (socket/index.ts)
  │
  ├── Auth Middleware
  │     ├── verify JWT with JWT_SECRET
  │     ├── check token.type === 'access'
  │     └── attach decoded payload to socket.user
  │
  └── Event Handlers
        ├── join_conversation  → verify participant → socket.join(roomId)
        ├── send_message       → save to MongoDB → io.to(room).emit()
        ├── typing             → socket.to(room).emit('user_typing')
        ├── mark_read          → updateMany readBy[] → emit 'message_read'
        └── disconnect         → log
```

---

## Middleware Stack

| Middleware | File | Purpose |
|---|---|---|
| `protect` | `auth.middleware.ts` | Verify JWT, attach `req.user` |
| `isAdmin` | `admin.middleware.ts` | Allow only `userRole === 1` |
| `protectedCreateQuery` | `createQueryProtected.middleware.ts` | Guests pass through; registered users must have token |
| `canUpdateQuery` | `updateDocByRole.middleware.ts` | Admin or query owner can update status |
| `updateByUser` | `updateByUser.middeware.ts` | Query owner only |
| `authAndOwnUser` | `authAndOwnUser.ts` | Verify access token type + DB user existence |
| `upload` | `multer.ts` | Multipart file parsing (memory storage) |
| `apiLimiter` | `rateLimiter.ts` | Global rate limit on all `/api` routes |

### Middleware Chaining Pattern

```
route.get('/queries', protect, isAdmin, getAllGuestQueries)
                       │         │           │
                       │         │           └── Controller: business logic
                       │         └── Role guard: reject non-admin
                       └── Auth guard: reject unauthenticated
```

---

## Database Schema

### Collections Overview

```
┌────────────────────────────────────────────────────────────────┐
│  users                                                         │
│  _id | userName | email | phone | password | userRole | ...    │
└────────────────────────┬───────────────────────────────────────┘
                         │ userId (ref)
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌─────────────┐  ┌────────────┐  ┌──────────────┐
│projectqueries│  │   reviews  │  │ chatrequests │
│             │  │            │  │              │
│ queryId ◄───┼──┤ queryId    │  │ senderId     │
│ userId      │  │ userId     │  │ receiverId   │
│ status      │  │ rating 1-5 │  │ status       │
│ typeOfUser  │  │ comment    │  └──────┬───────┘
└──────┬──────┘  └────────────┘         │ (on accept)
       │                                ▼
       │ guestId (ref)          ┌───────────────┐
       ▼                        │ conversations │
┌─────────────┐                 │               │
│  projects   │                 │ participants[] │
│             │                 │ chatRequestId │
│ milestones[]│                 └──────┬────────┘
│ progress    │                        │ conversationId
│ workType    │                        ▼
│ totalBudget │                 ┌───────────────┐
└─────────────┘                 │   messages    │
                                │               │
                                │ senderId      │
                                │ content       │
                                │ readBy[]      │
                                └───────────────┘
```

### Model Details

#### `User`
```ts
userName, email (unique), phone (unique), password (bcrypt),
userRole (1=admin, 2=user), profilePicUrl, refreshToken, timestamps
```

#### `ProjectQuery`
```ts
name, email, workType, budget, message,
typeOfUser ('guest' | 'registered'),
userId? (ref: User — only if registered),
status ('pending' | 'accepted' | 'rejected' | 'working' | 'cancelled' | 'completed'),
timestamps
```

#### `Project`
```ts
workType, totalBudget,
userId? (ref: User),
guestId (ref: ProjectQuery — required),
milestones [{ title, completed }],
progress (0–100),
timestamps
```
> Auto-created when a query's status is set to `'working'`.

#### `ChatRequest`
```ts
senderId (ref: User — registered user),
receiverId (ref: User — admin),
status ('pending' | 'accepted' | 'rejected'),
timestamps
// Index: { senderId, receiverId, status } — prevents duplicate pending requests
```

#### `Conversation`
```ts
participants [ObjectId] (ref: User — exactly 2),
chatRequestId (ref: ChatRequest),
lastMessage (string preview),
lastMessageAt (Date),
timestamps
```

#### `Message`
```ts
conversationId (ref: Conversation),
senderId (ref: User),
content (string, max 1000),
readBy [ObjectId] — array of userIds who read the message,
timestamps
// Index: { conversationId, createdAt: -1 } — fast history lookup
```

#### `Review`
```ts
queryId (ref: ProjectQuery — unique),  ← enforces one review per project at DB level
userId (ref: User),
rating (Number 1–5),
comment? (string, max 1000),
timestamps
// Index: { userId }
```

---

## Authentication Flow

### Sign In
```
POST /api/users/signin
  │
  ├── Find user by email
  ├── bcrypt.compare(password, hash)
  ├── generateTokens(userId, userRole)
  │     ├── accessToken  → JWT_SECRET,  expires 24h, type: 'access'
  │     └── refreshToken → JWT_REFRESH, expires 7d,  type: 'refresh'
  ├── Store refreshToken in user document (DB)
  └── Return { accessToken, refreshToken, user }
```

### Protected Request
```
GET /api/project/queries
  Authorization: Bearer <accessToken>
  │
  └── protect middleware
        ├── Extract token from Authorization header
        ├── jwt.verify(token, JWT_SECRET)
        └── Attach decoded { userId, userRole, type } to req.user
```

### Token Refresh
```
POST /api/users/refresh-token
  Body: { refreshToken }
  │
  ├── jwt.verify(token, JWT_REFRESH)
  ├── Check token.type === 'refresh'
  ├── Find user in DB
  ├── Compare token against user.refreshToken (reuse attack prevention)
  ├── generateTokens() — issue new pair
  ├── Save new refreshToken to DB (invalidate old one)
  └── Return { accessToken, refreshToken }
```

---

## Chat Flow

```
1. User sends: POST /api/chat/request
   └── Creates ChatRequest { status: 'pending' }

2. Admin sees: GET /api/chat/requests/pending

3. Admin responds: POST /api/chat/request/:id/respond { action: 'accept' }
   └── ChatRequest.status = 'accepted'
   └── Conversation created with participants: [userId, adminId]

4. Both parties connect via Socket.IO:
   socket = io(url, { auth: { token } })

5. Both join the conversation room:
   socket.emit('join_conversation', { conversationId })

6. User sends a message:
   socket.emit('send_message', { conversationId, content })
   └── Server saves Message to MongoDB (readBy: [sender])
   └── Server emits 'receive_message' to all in room

7. Admin receives message, marks read:
   socket.emit('mark_read', { conversationId })
   └── Server: Message.updateMany({ readBy: { $ne: adminId } }, { $addToSet: { readBy: adminId } })
   └── Server emits 'message_read' to room → user's UI updates tick marks
```

---

## Review Flow

```
Project lifecycle required before review:
  pending → accepted → working → completed
                                     │
                                     ▼
                          POST /api/reviews
                          { queryId, rating, comment }
                               │
                          Guards (in order):
                          1. rating is 1–5
                          2. query exists
                          3. caller is query owner (userId match)
                          4. query.status === 'completed'
                          5. no existing review for this queryId
                               │
                          Review saved to 'reviews' collection
```

---

## File Upload Flow

```
POST /api/file/upload
  multipart/form-data  field: 'image'
  │
  ├── multer (memoryStorage) — file in req.file.buffer
  ├── PutObjectCommand → Cloudflare R2
  └── Returns public URL: R2_PUBLIC_URL/images/<timestamp>-<filename>
```

---

## Rate Limiting

Global limiter applied to all `/api` routes:
- **Window:** 15 minutes
- **Max:** 50 requests per IP
- **Headers:** Standard `RateLimit-*` headers returned (no legacy `X-RateLimit-*`)

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default 8080) | Server port |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Access token signing secret |
| `JWT_REFRESH` | ✅ | Refresh token signing secret |
| `R2_ENDPOINT` | ✅ | Cloudflare R2 endpoint URL |
| `R2_ACCESS_KEY` | ✅ | R2 access key ID |
| `R2_SECRET_KEY` | ✅ | R2 secret access key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `R2_PUBLIC_URL` | ✅ | Public base URL for uploaded files |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Single HTTP server for REST + WebSocket | Avoids dual-port setup; Socket.IO runs on the same port as Express |
| Socket.IO without Redis adapter | Single-server portfolio — no horizontal scaling needed; simpler setup |
| MongoDB as sole message store | No Redis cache for messages; reduces ops complexity; sufficient for portfolio traffic |
| Refresh token stored in DB | Enables server-side invalidation (logout, reuse detection) |
| `protectedCreateQuery` middleware | Guests can submit queries without registration — reduces friction for potential clients |
| `unique: true` on `Review.queryId` | DB-level enforcement of one review per project — not just application-level |
| `Promise.all` in dashboard controller | All 8 aggregation queries run in parallel — dashboard loads in one round trip |
| Separate `Project` model from `ProjectQuery` | Query = client request; Project = active work with milestones. Concerns separated cleanly |
