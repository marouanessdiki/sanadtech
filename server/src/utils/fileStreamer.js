import { createReadStream, existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../../storage/usernames.txt');
const INDEX_FILE = path.join(__dirname, '../../../storage/letter-index.json');

// Cache for performance
let letterIndex = null;
let totalLineCount = null;

/**
 * Load or build the letter index for quick navigation
 */
async function loadLetterIndex() {
    if (letterIndex) return letterIndex;

    if (existsSync(INDEX_FILE)) {
        const data = await readFile(INDEX_FILE, 'utf-8');
        letterIndex = JSON.parse(data);
        return letterIndex;
    }

    console.log('🔤 Building letter index (first run)...');
    letterIndex = {};
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
            letterIndex[firstChar] = lineNumber;
            currentLetter = firstChar;
        }
        lineNumber++;
    }

    await writeFile(INDEX_FILE, JSON.stringify(letterIndex, null, 2));
    totalLineCount = lineNumber;

    return letterIndex;
}

/**
 * Get total count of users (cached)
 */
export async function getTotalCount() {
    if (totalLineCount !== null) return totalLineCount;

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
 * Get paginated users with efficient streaming
 */
export async function getUsersPaginated(offset, limit) {
    if (!existsSync(DATA_FILE)) {
        return { users: [], total: 0, offset, limit, hasMore: false };
    }

    const users = [];
    let currentLine = 0;

    const fileStream = createReadStream(DATA_FILE, { highWaterMark: 64 * 1024 });
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (currentLine >= offset) {
            users.push({
                id: currentLine,
                name: line.trim()
            });

            if (users.length >= limit) {
                rl.close();
                fileStream.destroy();
                break;
            }
        }
        currentLine++;
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
loadLetterIndex().catch(console.error);
getTotalCount().catch(console.error);
