# 📁 my-portfolio-back

A production-ready **REST API + WebSocket server** powering [tuhindev.me](https://tuhindev.me) — built with **Express**, **TypeScript**, **MongoDB** (Mongoose), and **Socket.IO**.

---

## ✨ Features

- 🔐 JWT-based authentication with access + refresh token rotation
- 🛡️ Role-based access control (Admin / Registered User / Guest)
- 📋 Project query system (guest & registered user flows)
- 💬 Real-time messaging between users and admin via Socket.IO
- 📁 File upload to Cloudflare R2 (S3-compatible)
- ⭐ Rating & review system (only after project completion)
- 📊 Admin dashboard with aggregated stats
- 🚦 Global rate limiting (50 req / 15 min)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express v5 |
| Database | MongoDB + Mongoose |
| Real-time | Socket.IO |
| Auth | JWT (jsonwebtoken) + bcrypt |
| File Storage | Cloudflare R2 (via AWS SDK S3) |
| Rate Limiting | express-rate-limit |
| Dev Tools | ts-node-dev, nodemon |

---

## 📦 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB (Atlas or local)
- Cloudflare R2 bucket (for file uploads)

### Installation

```bash
git clone https://github.com/Tuhin1904/portfolio-backend.git
cd portfolio-backend
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=8080

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/portfolio

# JWT
JWT_SECRET=your_access_token_secret
JWT_REFRESH=your_refresh_token_secret

# Cloudflare R2
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://pub-<id>.r2.dev
```

### Running

```bash
# Development (hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

---

## 🗂️ Project Structure

```
src/
├── server.ts               # Entry point — DB connect → HTTP + Socket.IO server
├── app.ts                  # Express app (CORS, middleware, routes)
├── config/
│   ├── db.ts               # Mongoose connection
│   └── r2.ts               # Cloudflare R2 (S3) client
├── models/                 # Mongoose schemas
│   ├── user.model.ts
│   ├── projectQuery.model.ts
│   ├── project.model.ts
│   ├── chatRequest.model.ts
│   ├── conversation.model.ts
│   ├── message.model.ts
│   └── review.model.ts
├── controllers/            # Business logic
├── middleware/             # Auth, role guards, multer, rate limiter
├── routes/                 # Grouped route definitions
│   ├── index.ts            # Root router
│   ├── users/
│   ├── Queries/
│   ├── chat/
│   ├── dashboard/
│   ├── reviews/
│   └── fileUpload/
├── socket/
│   └── index.ts            # Socket.IO server & event handlers
├── types/
│   └── user.ts             # IUser interface
└── utils/
    ├── generateToken.ts    # JWT access + refresh token generator
    └── rateLimiter.ts      # express-rate-limit config
```

---

## 🌐 API Reference

Base URL: `https://tuhindev.me/api` | Local: `http://localhost:8080/api`

### 🏓 Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ping` | None | Server health check |

---

### 👤 Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | None | Register a new user |
| POST | `/signin` | None | Login — returns access + refresh tokens |
| POST | `/refresh-token` | None | Rotate tokens using refresh token |
| PUT | `/update-profile` | `protect` | Update own profile (userName, phone, location, profilePicUrl) |

#### POST `/signup`
```json
{ "userName": "Tuhin", "email": "t@t.com", "phone": "9999999999", "password": "pass123" }
```

#### POST `/signin`
```json
{ "email": "t@t.com", "password": "pass123" }
```
Returns: `accessToken`, `refreshToken`, `user` object.

#### POST `/refresh-token`
```json
{ "refreshToken": "<token>" }
```
Returns new `accessToken` + rotated `refreshToken`. Old refresh token is immediately invalidated.

---

### 📋 Project Queries — `/api/project`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/queries` | Optional (guest/registered) | Submit a new project query |
| GET | `/queries` | Admin only | Get all queries (paginated) |
| GET | `/queries/:id` | Admin only | Get single query |
| GET | `/queries/my` | `protect` | Get own queries |
| GET | `/queries/my/:id` | `protect` | Get own query by ID |
| POST | `/queries/:id/status` | `protect` | Update query status |

#### POST `/queries` — Query Body
```json
{
  "name": "John",
  "email": "john@example.com",
  "workType": "Web App",
  "budget": "$500",
  "message": "I need a portfolio",
  "typeOfUser": "guest"   // or "registered" (requires Bearer token)
}
```

#### GET `/queries` — Pagination
```
GET /api/project/queries?page=1&pageSize=10
```

#### POST `/queries/:id/status` — Status values
`pending` → `accepted` → `working` → `completed`
`pending` → `rejected`
`working` → `cancelled`

Setting status to `working` automatically creates a `Project` record with default milestones.

---

### 💬 Chat — `/api/chat`

#### Request Flow

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/request` | `protect` (user) | Send chat request to admin |
| POST | `/request/:id/respond` | Admin only | Accept or reject request |
| GET | `/requests/pending` | Admin only | View pending incoming requests |
| GET | `/requests/my` | `protect` | View own sent requests |

#### POST `/request/respond` Body
```json
{ "action": "accept" }   // or "reject"
```
Accepting creates a `Conversation` document automatically.

#### Conversations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/conversations` | `protect` | List all conversations |
| GET | `/conversations/:id/messages` | `protect` | Paginated message history |
| PATCH | `/conversations/:id/read` | `protect` | Mark messages as read |

---

### 🔌 Real-time Messaging — Socket.IO

Connect: `ws://localhost:8080` with auth header:
```js
const socket = io('http://localhost:8080', {
  auth: { token: '<accessToken>' }
});
```

#### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | `{ conversationId }` | Join a chat room |
| `send_message` | `{ conversationId, content }` | Send a message |
| `typing` | `{ conversationId, isTyping }` | Typing indicator |
| `mark_read` | `{ conversationId }` | Mark messages as read |

#### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `joined` | `{ conversationId }` | Room join confirmed |
| `receive_message` | full message object | New message broadcast |
| `user_typing` | `{ userId, isTyping }` | Typing state of other party |
| `message_read` | `{ conversationId, readByUserId }` | Read receipt update |
| `error` | `{ message }` | Error notification |

---

### ⭐ Reviews — `/api/reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | `protect` | Submit review (project must be "completed") |
| GET | `/` | None | Get all reviews with rating summary (public) |
| GET | `/query/:queryId` | `protect` | Get review for a specific project |

#### POST `/` Body
```json
{ "queryId": "<projectQueryId>", "rating": 5, "comment": "Excellent work!" }
```
**Guards:** caller must be the query owner AND query status must be `completed`. One review per project (enforced at DB level with unique index).

#### GET `/` Response includes rating summary:
```json
{
  "summary": {
    "averageRating": 4.7,
    "totalReviews": 12,
    "breakdown": { "5": 8, "4": 3, "3": 1, "2": 0, "1": 0 }
  },
  "data": [...],
  "pagination": { ... }
}
```

---

### 📊 Dashboard — `/api/dashboard`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stats` | Admin only | Aggregated stats for admin panel |

#### Response
```json
{
  "queries": {
    "total": 47,
    "byStatus": { "pending": 12, "accepted": 8, "working": 10, "completed": 10, ... },
    "guestCount": 30,
    "registeredCount": 17,
    "ratio": { "guest": 63.8, "registered": 36.2 }
  },
  "users": {
    "total": 24,
    "newLast7Days": 3,
    "newLast30Days": 11
  },
  "chatRequests": {
    "total": 9,
    "byStatus": { "pending": 4, "accepted": 3, "rejected": 2 }
  }
}
```

---

### 📁 File Upload — `/api/file`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload` | None | Upload image to Cloudflare R2 |

Form field name: `image`. Returns a public URL.

---

## 🔐 Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

### User Roles
| Role | `userRole` value | Access |
|------|-----------------|--------|
| Admin | `1` | All routes |
| Registered User | `2` | Own data + chat with admin |
| Guest | n/a | Submit queries only |

### Token Lifecycle
- **Access Token** — expires in `24h`, used for all API calls
- **Refresh Token** — expires in `7d`, stored in DB, used to rotate both tokens
- On logout (future): refresh token cleared from DB, invalidating the session

---

## 📝 License

MIT
