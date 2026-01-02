const API_BASE = 'http://localhost:3001/api';

/**
 * Fetch paginated users
 * @param {number} offset - Starting index
 * @param {number} limit - Number of users to fetch
 */
export async function fetchUsers(offset = 0, limit = 100) {
    const response = await fetch(`${API_BASE}/users?offset=${offset}&limit=${limit}`);
    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }
    return response.json();
}

/**
 * Get total user count
 */
export async function fetchUserCount() {
    const response = await fetch(`${API_BASE}/users/count`);
    if (!response.ok) {
        throw new Error('Failed to fetch count');
    }
    return response.json();
}

/**
 * Jump to a specific letter
 * @param {string} letter - Single letter A-Z
 */
export async function jumpToLetter(letter) {
    const response = await fetch(`${API_BASE}/users/jump/${letter}`);
    if (!response.ok) {
        throw new Error('Failed to jump to letter');
    }
    return response.json();
}

/**
 * Get letter statistics for navigation
 */
export async function fetchLetterStats() {
    const response = await fetch(`${API_BASE}/users/letters`);
    if (!response.ok) {
        throw new Error('Failed to fetch letter stats');
    }
    return response.json();
}
