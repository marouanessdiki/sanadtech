# Large User List Application

A web application that efficiently displays **630,000+ sorted usernames** without causing the browser to freeze. Features infinite scroll and alphabetical navigation.

![User Directory Preview](https://via.placeholder.com/800x400?text=User+Directory+App)

## 🚀 Quick Start

```bash
# 1. Start the backend
cd server
npm install
npm run dev

# 2. Start the frontend (new terminal)
cd client
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## 📋 Features

| Feature | Description |
|---------|-------------|
| **Virtual Scrolling** | Only renders visible items (~20-30 at a time) |
| **Infinite Loading** | Fetches data in batches as you scroll |
| **A-Z Navigation** | Click any letter to jump instantly |
| **Rate Limiting** | Protection against API abuse (1000 req/15min) |
| **Structured Logging** | Winston logger with file rotation |

## 🏗️ Architecture

```
sanadtech/
├── server/                  # Node.js + Express backend
│   ├── src/
│   │   ├── index.js         # Express server (port 3001)
│   │   ├── routes/          # API endpoints
│   │   └── utils/
│   │       ├── fileStreamer.js  # File streaming logic
│   │       └── logger.js    # Winston logger
│   ├── tests/               # Jest API tests
│   └── logs/                # Application logs
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/      # UserList, AlphabetNav
│       ├── hooks/           # useInfiniteUsers (Map-based)
│       └── services/        # API communication
└── storage/
    └── usernames.txt        # 630K sorted names
```

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/users?offset=0&limit=500` | Paginated user list |
| `GET /api/users/count` | Total user count |
| `GET /api/users/jump/:letter` | Jump to letter position |
| `GET /api/users/letters` | Letter statistics |
| `GET /health` | Health check with uptime and memory |

## 🧪 Running Tests

```bash
cd server
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
```

### Test Coverage

- ✅ User pagination endpoint
- ✅ Offset/limit validation
- ✅ Max limit enforcement (1000)
- ✅ User count endpoint
- ✅ Letter statistics endpoint
- ✅ Letter jump navigation
- ✅ Input validation (invalid letters)

## ⚡ Performance Optimizations

### Backend
- **64KB read buffers** for fast file streaming
- **Early termination** - stops reading once limit reached
- **Letter index caching** - O(1) letter navigation
- **Pre-warmed caches** on server startup

### Frontend
- **Map-based storage** instead of sparse array (memory efficient)
- **Parallel page loading** (3 pages at a time)
- **40px row height** - stays within browser scroll limits
- **Memoized components** - prevents unnecessary re-renders

## � Security Features

- **Rate Limiting**: 1000 requests per 15 minutes per IP
- **CORS Restrictions**: Only allows configured origins
- **Input Validation**: Validates all user input
- **Error Handling**: Proper error responses without stack traces

## �📊 Logging & Observability

The application uses Winston for structured logging:

```
logs/
├── combined.log    # All logs (info, warn, error)
└── error.log       # Errors only
```

Each request is logged with:
- HTTP method and path
- Query parameters
- Response status
- Duration (ms)
- Client IP

## 📝 Technical Notes

- **Max scroll height**: Browser limit is ~33M pixels. With 40px rows, we support up to 800K+ items.
- **Data file**: Plain text, one name per line, sorted alphabetically.
- **Letter index**: Auto-generated on first request, cached in `storage/letter-index.json`.

## 📄 License

ISC
