# Large User List Application

A web application that efficiently displays **10 million+ sorted usernames** without causing the browser to freeze. Features infinite scroll, alphabetical navigation, and O(1) random access.

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

## 📁 Using Your Own Data File

### Step 1: Prepare your file
Place your sorted usernames file in the `storage/` folder:
```
storage/usernames.txt
```

**Requirements:**
- One name per line
- Sorted alphabetically
- UTF-8 encoding

### Step 2: Start the server
The indexes will auto-regenerate on first request:
```bash
cd server && npm run dev
```

That's it! The system automatically:
- ✅ Detects file changes (size/modification time)
- ✅ Rebuilds letter index for A-Z navigation
- ✅ Rebuilds byte offset index for fast random access

## 📋 Features

| Feature | Description |
|---------|-------------|
| **Virtual Scrolling** | Only renders visible items (~30 at a time) |
| **10M+ Scalability** | Scroll position remapping for unlimited data |
| **O(1) Random Access** | Byte offset indexing for instant seeking |
| **Auto-Indexing** | Indexes regenerate when data file changes |
| **A-Z Navigation** | Click any letter to jump instantly |
| **Rate Limiting** | Protection against API abuse |

## 🚀 10 Million+ Scalability

### The Challenge
Browsers have a max scroll height (~33M pixels). With 40px rows:
- 10M users × 40px = 400M pixels ❌ (exceeds limit)

### The Solution
**Scroll Position Remapping**: Maps 250K virtual items to 10M+ actual items.

```javascript
// Virtual index → Actual index
const ratio = virtualIndex / (virtualCount - 1);
const actualIndex = Math.floor(ratio * (totalCount - 1));
```

When dataset exceeds 250K items, "🚀 10M+ Mode" activates automatically.

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/users?offset=0&limit=500` | Paginated user list |
| `GET /api/users/count` | Total user count |
| `GET /api/users/jump/:letter` | Jump to letter position |
| `GET /api/users/letters` | Letter statistics |
| `GET /health` | Health check |

## 🧪 Running Tests

```bash
cd server
npm test           # 11 tests passing
npm run test:coverage
```

## ⚡ Performance

### Backend Optimizations
- **Byte offset indexing** - O(1) access to any line (checkpoints every 10K lines)
- **File streaming** - 64KB buffers, early termination
- **Auto-caching** - Indexes cached with file signature validation

### Frontend Optimizations
- **Scroll remapping** - Supports 10M+ items within browser limits
- **Map-based storage** - Efficient sparse data handling
- **Parallel loading** - 3 pages fetched simultaneously
- **Memoized components** - Prevents unnecessary re-renders

## 🔒 Security

- Rate limiting (1000 req/15min per IP)
- CORS restrictions
- Input validation
- Structured logging (Winston)

## 📄 License

ISC
