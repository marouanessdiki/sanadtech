import { useCallback, useRef, memo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import './UserList.css';

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
 * Virtualized user list component
 * Uses @tanstack/react-virtual for efficient rendering
 */
function UserList({ users, totalCount, onItemsRendered, isItemLoaded, listRef }) {
    const parentRef = useRef(null);
    const lastLoadedRangeRef = useRef({ start: -1, end: -1 });

    const virtualizer = useVirtualizer({
        count: totalCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40,
        overscan: 50, // Increased overscan significantly
    });

    const items = virtualizer.getVirtualItems();

    // Function to load data for current visible range
    const loadCurrentRange = useCallback(() => {
        if (items.length === 0 || totalCount === 0) return;

        const firstIndex = items[0].index;
        const lastIndex = items[items.length - 1].index;

        // Add larger buffer for smoother loading
        const bufferSize = 200;
        const startIndex = Math.max(0, firstIndex - bufferSize);
        const stopIndex = Math.min(totalCount - 1, lastIndex + bufferSize);

        // Only trigger if range changed
        if (
            startIndex !== lastLoadedRangeRef.current.start ||
            stopIndex !== lastLoadedRangeRef.current.end
        ) {
            lastLoadedRangeRef.current = { start: startIndex, end: stopIndex };
            onItemsRendered(startIndex, stopIndex);
        }
    }, [items, totalCount, onItemsRendered]);

    // Load data when items change
    useEffect(() => {
        loadCurrentRange();
    }, [loadCurrentRange]);

    // Also load on scroll events
    const handleScroll = useCallback(() => {
        // Small debounce via requestAnimationFrame
        requestAnimationFrame(() => {
            loadCurrentRange();
        });
    }, [loadCurrentRange]);

    // Expose scrollToIndex via ref - use direct scroll calculation
    useEffect(() => {
        if (listRef) {
            listRef.current = {
                scrollToItem: (index) => {
                    // Calculate scroll position directly (index * itemSize)
                    const scrollTop = index * 40; // 40px per item
                    if (parentRef.current) {
                        parentRef.current.scrollTop = scrollTop;
                        // Trigger data load after scroll
                        setTimeout(() => loadCurrentRange(), 50);
                    }
                }
            };
        }
    }, [listRef, loadCurrentRange]);

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
                {items.map((virtualRow) => (
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
                            user={users[virtualRow.index]}
                            index={virtualRow.index}
                            isLoaded={isItemLoaded(virtualRow.index)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default memo(UserList);
