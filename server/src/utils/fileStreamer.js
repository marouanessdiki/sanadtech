import { createReadStream, existsSync, statSync } from 'fs';
import { readFile, writeFile, unlink } from 'fs/promises';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../../storage/usernames.txt');
const INDEX_FILE = path.join(__dirname, '../../../storage/letter-index.json');
const OFFSET_INDEX_FILE = path.join(__dirname, '../../../storage/byte-offsets.json');

// Index every N lines for fast random access
const INDEX_INTERVAL = 10000;

// Cache for performance
let letterIndex = null;
let totalLineCount = null;
let byteOffsets = null;
let dataFileSignature = null; // Tracks file size + mtime to detect changes

/**
 * Get file signature (size + modification time) to detect file changes
 */
function getFileSignature() {
    if (!existsSync(DATA_FILE)) return null;
    const stats = statSync(DATA_FILE);
    return `${stats.size}-${stats.mtimeMs}`;
}

/**
 * Check if indexes need to be rebuilt (file changed)
 */
async function checkAndInvalidateIndexes() {
    const currentSignature = getFileSignature();

    if (dataFileSignature && dataFileSignature !== currentSignature) {
        console.log('📁 Data file changed, rebuilding indexes...');
        // Clear caches
        letterIndex = null;
        byteOffsets = null;
        totalLineCount = null;

        // Delete old index files
        try {
            if (existsSync(INDEX_FILE)) await unlink(INDEX_FILE);
            if (existsSync(OFFSET_INDEX_FILE)) await unlink(OFFSET_INDEX_FILE);
        } catch (e) {
            console.error('Error deleting old indexes:', e.message);
        }
    }

    dataFileSignature = currentSignature;
}

/**
 * Validate that index matches current data file
 */
async function isIndexValid(indexFile, expectedSignature) {
    if (!existsSync(indexFile)) return false;

    try {
        const data = await readFile(indexFile, 'utf-8');
        const index = JSON.parse(data);
        return index.fileSignature === expectedSignature;
    } catch {
        return false;
    }
}

/**
 * Build byte offset index for fast random access
 * This allows O(1) seeking to any line number
 */
async function buildByteOffsetIndex() {
    const currentSignature = getFileSignature();

    // Check if cached and valid
    if (byteOffsets && byteOffsets.fileSignature === currentSignature) {
        return byteOffsets;
    }

    // Try to load from file
    if (await isIndexValid(OFFSET_INDEX_FILE, currentSignature)) {
        const data = await readFile(OFFSET_INDEX_FILE, 'utf-8');
        byteOffsets = JSON.parse(data);
        console.log(`📍 Loaded byte offset index (${Object.keys(byteOffsets.offsets).length} checkpoints)`);
        return byteOffsets;
    }

    console.log('📍 Building byte offset index...');
    const startTime = Date.now();

    byteOffsets = {
        offsets: {},
        totalLines: 0,
        fileSignature: currentSignature
    };
    let bytePosition = 0;
    let lineNumber = 0;

    const fileStream = createReadStream(DATA_FILE, {
        highWaterMark: 256 * 1024,
        encoding: 'utf-8'
    });
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (lineNumber % INDEX_INTERVAL === 0) {
            byteOffsets.offsets[lineNumber] = bytePosition;
        }
        bytePosition += Buffer.byteLength(line, 'utf-8') + 1;
        lineNumber++;

        // Progress logging for large files
        if (lineNumber % 1000000 === 0) {
            console.log(`   📍 Indexed ${(lineNumber / 1000000).toFixed(0)}M lines...`);
        }
    }

    byteOffsets.totalLines = lineNumber;
    totalLineCount = lineNumber;

    await writeFile(OFFSET_INDEX_FILE, JSON.stringify(byteOffsets));
    console.log(`📍 Built byte offset index in ${Date.now() - startTime}ms (${lineNumber.toLocaleString()} lines)`);

    return byteOffsets;
}

/**
 * Load or build the letter index for quick navigation
 */
async function loadLetterIndex() {
    const currentSignature = getFileSignature();

    // Check if cached and valid
    if (letterIndex && letterIndex.fileSignature === currentSignature) {
        return letterIndex.data;
    }

    // Try to load from file
    if (await isIndexValid(INDEX_FILE, currentSignature)) {
        const data = await readFile(INDEX_FILE, 'utf-8');
        letterIndex = JSON.parse(data);
        console.log(`🔤 Loaded letter index (${Object.keys(letterIndex.data).length} letters)`);
        return letterIndex.data;
    }

    console.log('🔤 Building letter index...');
    const startTime = Date.now();

    letterIndex = {
        data: {},
        fileSignature: currentSignature
    };
    let lineNumber = 0;
    let currentLetter = '';

    const fileStream = createReadStream(DATA_FILE, { highWaterMark: 64 * 1024 });
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const firstChar = line.charAt(0).toUpperCase();
        if (firstChar !== currentLetter && /[A-Z]/.test(firstChar)) {
            letterIndex.data[firstChar] = lineNumber;
            currentLetter = firstChar;
        }
        lineNumber++;
    }

    totalLineCount = lineNumber;
    await writeFile(INDEX_FILE, JSON.stringify(letterIndex, null, 2));
    console.log(`🔤 Built letter index in ${Date.now() - startTime}ms`);

    return letterIndex.data;
}

/**
 * Get total count of users (cached)
 */
export async function getTotalCount() {
    if (totalLineCount !== null) return totalLineCount;

    const offsets = await buildByteOffsetIndex();
    if (offsets.totalLines) {
        totalLineCount = offsets.totalLines;
        return totalLineCount;
    }

    let count = 0;
    const fileStream = createReadStream(DATA_FILE, { highWaterMark: 64 * 1024 });
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        count++;
    }

    totalLineCount = count;
    return count;
}

/**
 * Get paginated users with FAST random access using byte offsets
 */
export async function getUsersPaginated(offset, limit) {
    if (!existsSync(DATA_FILE)) {
        return { users: [], total: 0, offset, limit, hasMore: false };
    }

    const offsets = await buildByteOffsetIndex();
    const users = [];

    // Find nearest checkpoint before our offset
    const checkpointLine = Math.floor(offset / INDEX_INTERVAL) * INDEX_INTERVAL;
    const byteStart = offsets.offsets[checkpointLine] || 0;
    const linesToSkip = offset - checkpointLine;

    const fileStream = createReadStream(DATA_FILE, {
        start: byteStart,
        highWaterMark: 64 * 1024
    });
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let skipped = 0;
    let currentLine = checkpointLine;

    for await (const line of rl) {
        if (skipped < linesToSkip) {
            skipped++;
            currentLine++;
            continue;
        }

        users.push({
            id: currentLine,
            name: line.trim()
        });
        currentLine++;

        if (users.length >= limit) {
            rl.close();
            fileStream.destroy();
            break;
        }
    }

    const total = totalLineCount ?? await getTotalCount();

    return {
        users,
        total,
        offset,
        limit,
        hasMore: offset + users.length < total
    };
}

/**
 * Jump to first user starting with given letter
 */
export async function jumpToLetter(letter) {
    const index = await loadLetterIndex();

    if (!index[letter]) {
        const letters = Object.keys(index).sort();
        const nearestIdx = letters.findIndex(l => l >= letter);
        const nearestLetter = letters[nearestIdx] || letters[letters.length - 1];

        return {
            letter: nearestLetter,
            lineNumber: index[nearestLetter],
            exact: false
        };
    }

    return {
        letter,
        lineNumber: index[letter],
        exact: true
    };
}

/**
 * Get statistics about available letters
 */
export async function getLetterStats() {
    const index = await loadLetterIndex();
    const total = await getTotalCount();

    const letters = Object.entries(index).map(([letter, startLine], idx, arr) => {
        const nextEntry = arr[idx + 1];
        const endLine = nextEntry ? nextEntry[1] - 1 : total - 1;
        const count = endLine - startLine + 1;

        return { letter, startLine, count };
    });

    return { letters, total };
}

// Pre-warm caches on module load
buildByteOffsetIndex().catch(console.error);
loadLetterIndex().catch(console.error);
