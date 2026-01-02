import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchUsers, fetchUserCount } from '../services/api';

/**
 * Custom hook for infinite scrolling user data
 * Uses a Map for efficient sparse data storage instead of a huge array
 */
export function useInfiniteUsers(pageSize = 500) {
    const [usersMap, setUsersMap] = useState(new Map());
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Track which pages have been loaded
    const loadedPages = useRef(new Set());
    const loadingPages = useRef(new Set());

    // Fetch initial count
    useEffect(() => {
        async function init() {
            try {
                const { count } = await fetchUserCount();
                setTotalCount(count);
            } catch (err) {
                setError(err.message);
            }
        }
        init();
    }, []);

    /**
     * Load users for a specific range
     */
    const loadUsersInRange = useCallback(async (startIndex, stopIndex) => {
        if (totalCount === 0) return;

        // Calculate page boundaries
        const startPage = Math.floor(startIndex / pageSize);
        const endPage = Math.floor(stopIndex / pageSize);

        const pagesToLoad = [];

        for (let page = startPage; page <= endPage; page++) {
            // Skip if already loaded or currently loading
            if (loadedPages.current.has(page) || loadingPages.current.has(page)) {
                continue;
            }
            pagesToLoad.push(page);
        }

        if (pagesToLoad.length === 0) return;

        setLoading(true);

        // Load pages in parallel (max 3 at a time)
        const chunks = [];
        for (let i = 0; i < pagesToLoad.length; i += 3) {
            chunks.push(pagesToLoad.slice(i, i + 3));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (page) => {
                loadingPages.current.add(page);

                try {
                    const offset = page * pageSize;
                    const result = await fetchUsers(offset, pageSize);

                    // Update users map with fetched data
                    setUsersMap(prev => {
                        const updated = new Map(prev);
                        result.users.forEach((user, idx) => {
                            updated.set(offset + idx, user);
                        });
                        return updated;
                    });

                    loadedPages.current.add(page);
                } catch (err) {
                    console.error(`Failed to load page ${page}:`, err);
                } finally {
                    loadingPages.current.delete(page);
                }
            }));
        }

        setLoading(false);
    }, [pageSize, totalCount]);

    /**
     * Jump to a specific index and load surrounding data
     */
    const jumpToIndex = useCallback(async (index) => {
        // Load a window around the target index
        const windowSize = pageSize * 5;
        const startIndex = Math.max(0, index - pageSize);
        const endIndex = Math.min(totalCount - 1, index + windowSize);

        await loadUsersInRange(startIndex, endIndex);

        return index;
    }, [loadUsersInRange, pageSize, totalCount]);

    /**
     * Check if a specific item is loaded
     */
    const isItemLoaded = useCallback((index) => {
        return usersMap.has(index);
    }, [usersMap]);

    /**
     * Get user at index (for compatibility with array-like access)
     */
    const getUser = useCallback((index) => {
        return usersMap.get(index) || null;
    }, [usersMap]);

    // Create a proxy object that looks like an array but uses the Map
    const users = {
        get length() { return totalCount; },
        [Symbol.iterator]: function* () {
            for (let i = 0; i < totalCount; i++) {
                yield usersMap.get(i) || null;
            }
        }
    };

    // Allow array-like access: users[index]
    const usersProxy = new Proxy(users, {
        get(target, prop) {
            if (typeof prop === 'string' && !isNaN(prop)) {
                return usersMap.get(parseInt(prop)) || null;
            }
            return target[prop];
        }
    });

    return {
        users: usersProxy,
        totalCount,
        loading,
        error,
        loadUsersInRange,
        jumpToIndex,
        isItemLoaded,
        getUser
    };
}
