# Large User List Application

A web application that efficiently displays **630,000+ sorted usernames** without causing the browser to freeze. Features infinite scroll and alphabetical navigation.

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

## 🏗️ Architecture

```
sanadtech/
├── server/              # Node.js + Express backend
│   └── src/
│       ├── index.js     # Express server (port 3001)
│       ├── routes/      # API endpoints
│       └── utils/       # File streaming utilities
├── client/              # React + Vite frontend
│   └── src/
│       ├── components/  # UserList, AlphabetNav
│       └── hooks/       # useInfiniteUsers (Map-based)
└── storage/
    └── usernames.txt    # 630K sorted names
```

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/users?offset=0&limit=500` | Paginated user list |
| `GET /api/users/count` | Total user count |
| `GET /api/users/jump/:letter` | Jump to letter position |
| `GET /api/users/letters` | Letter statistics |

## ⚡ Performance Optimizations

### Backend
- **64KB read buffers** for fast file streaming
- **Early termination** - stops reading once limit reached
- **Letter index caching** - O(1) letter navigation

### Frontend
- **Map-based storage** instead of sparse array (memory efficient)
- **Parallel page loading** (3 pages at a time)
- **40px row height** - stays within browser scroll limits
- **Memoized components** - prevents unnecessary re-renders

## 📊 Technical Notes

- **Max scroll height**: Browser limit is ~33M pixels. With 40px rows, we support up to 800K+ items.
- **Data file**: Plain text, one name per line, sorted alphabetically.
- **Letter index**: Auto-generated on first request, cached in `storage/letter-index.json`.
