import { useCallback, useRef, memo, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import './UserList.css';

/**
 * Constants for scroll chunking
 * This technique allows us to support 10M+ items by remapping scroll positions
 */
const ITEM_HEIGHT = 40;
const MAX_BROWSER_HEIGHT = 10_000_000; // Safe max height (10M pixels)
const VISIBLE_CHUNK_SIZE = Math.floor(MAX_BROWSER_HEIGHT / ITEM_HEIGHT); // ~250,000 items per chunk

/**
 * Individual user row component
 * Memoized for performance with large lists
 */
const UserRow = memo(({ user, index, isLoaded }) => {
    return (
        <div className={`user-row ${!isLoaded ? 'loading' : ''}`}>
            <div className="user-row-content">
                <span className="user-index">#{(index + 1).toLocaleString()}</span>
                {isLoaded ? (
                    <>
                        <span className="user-avatar">
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                        <span className="user-name">{user?.name || 'Unknown'}</span>
                    </>
                ) : (
                    <>
                        <span className="user-avatar skeleton"></span>
                        <span className="user-name skeleton">Loading...</span>
                    </>
                )}
            </div>
        </div>
    );
});

UserRow.displayName = 'UserRow';

/**
 * Scalable virtualized user list component
 * Uses scroll position remapping to support 10M+ items
 * 
 * HOW IT WORKS:
 * - Browser limits scroll height to ~33M pixels
 * - 10M items × 40px = 400M pixels (exceeds limit)
 * - We use a "virtual scroll ratio" to map scroll position to actual data
 * - The scrollbar represents the entire dataset, but we only render a window
 */
function UserList({ users, totalCount, onItemsRendered, isItemLoaded, listRef }) {
    const parentRef = useRef(null);
    const lastLoadedRangeRef = useRef({ start: -1, end: -1 });

    // Calculate scaling factor for 10M+ support
    const needsScaling = totalCount > VISIBLE_CHUNK_SIZE;
    const scaleFactor = needsScaling ? totalCount / VISIBLE_CHUNK_SIZE : 1;
    const virtualCount = needsScaling ? VISIBLE_CHUNK_SIZE : totalCount;

    // Track the virtual scroll offset for position calculation
    const [scrollRatio, setScrollRatio] = useState(0);

    const virtualizer = useVirtualizer({
        count: virtualCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 50,
    });

    const items = virtualizer.getVirtualItems();

    // Calculate actual data indices from virtual indices
    // Uses ratio mapping to ensure last virtual item maps to last actual item
    const getActualIndex = useCallback((virtualIndex) => {
        if (!needsScaling) return virtualIndex;
        // Map 0 to 0, and (virtualCount-1) to (totalCount-1)
        const ratio = virtualIndex / (virtualCount - 1);
        return Math.min(Math.floor(ratio * (totalCount - 1)), totalCount - 1);
    }, [needsScaling, virtualCount, totalCount]);

    // Function to load data for current visible range
    const loadCurrentRange = useCallback(() => {
        if (items.length === 0 || totalCount === 0) return;

        const firstVirtualIndex = items[0].index;
        const lastVirtualIndex = items[items.length - 1].index;

        // Convert to actual indices
        const firstActualIndex = getActualIndex(firstVirtualIndex);
        const lastActualIndex = getActualIndex(lastVirtualIndex);

        // Add buffer for smoother loading
        const bufferSize = needsScaling ? 500 : 200;
        const startIndex = Math.max(0, firstActualIndex - bufferSize);
        const stopIndex = Math.min(totalCount - 1, lastActualIndex + bufferSize);

        // Only trigger if range changed significantly
        if (
            Math.abs(startIndex - lastLoadedRangeRef.current.start) > 50 ||
            Math.abs(stopIndex - lastLoadedRangeRef.current.end) > 50
        ) {
            lastLoadedRangeRef.current = { start: startIndex, end: stopIndex };
            onItemsRendered(startIndex, stopIndex);
        }
    }, [items, totalCount, onItemsRendered, getActualIndex, needsScaling]);

    // Load data when items change
    useEffect(() => {
        loadCurrentRange();
    }, [loadCurrentRange]);

    // Handle scroll with ratio tracking
    const handleScroll = useCallback(() => {
        requestAnimationFrame(() => {
            if (parentRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
                const maxScroll = scrollHeight - clientHeight;
                const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
                setScrollRatio(ratio);
            }
            loadCurrentRange();
        });
    }, [loadCurrentRange]);

    // Expose scrollToIndex via ref with scaling support
    useEffect(() => {
        if (listRef) {
            listRef.current = {
                scrollToItem: (actualIndex) => {
                    // Convert actual index to virtual index
                    const virtualIndex = needsScaling
                        ? Math.floor(actualIndex / scaleFactor)
                        : actualIndex;

                    const scrollTop = virtualIndex * ITEM_HEIGHT;
                    if (parentRef.current) {
                        parentRef.current.scrollTop = scrollTop;
                        setTimeout(() => loadCurrentRange(), 50);
                    }
                }
            };
        }
    }, [listRef, loadCurrentRange, needsScaling, scaleFactor]);

    // Calculate current position for display
    const currentPosition = Math.floor(scrollRatio * totalCount);

    if (totalCount === 0) {
        return (
            <div className="user-list-empty">
                <div className="empty-icon">📋</div>
                <h3>No Users Found</h3>
                <p>Make sure the backend server is running and users.txt exists</p>
            </div>
        );
    }

    return (
        <div className="user-list-wrapper">
            {/* Position indicator for large datasets */}
            {needsScaling && (
                <div className="scroll-position-indicator">
                    <span className="position-current">{currentPosition.toLocaleString()}</span>
                    <span className="position-separator">/</span>
                    <span className="position-total">{totalCount.toLocaleString()}</span>
                    <span className="scaling-badge" title="Using scroll remapping for 10M+ support">
                        🚀 10M+ Mode
                    </span>
                </div>
            )}

            <div
                ref={parentRef}
                className="user-list-container"
                style={{ height: '600px', overflow: 'auto' }}
                onScroll={handleScroll}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {items.map((virtualRow) => {
                        // Map virtual index to actual data index
                        const actualIndex = getActualIndex(virtualRow.index);

                        return (
                            <div
                                key={virtualRow.key}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                <UserRow
                                    user={users[actualIndex]}
                                    index={actualIndex}
                                    isLoaded={isItemLoaded(actualIndex)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default memo(UserList);
