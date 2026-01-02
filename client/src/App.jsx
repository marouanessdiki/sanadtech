import { useState, useRef, useEffect, useCallback } from 'react';
import UserList from './components/UserList';
import AlphabetNav from './components/AlphabetNav';
import { useInfiniteUsers } from './hooks/useInfiniteUsers';
import { jumpToLetter, fetchLetterStats } from './services/api';
import './App.css';

function App() {
  const {
    users,
    totalCount,
    loading,
    error,
    loadUsersInRange,
    jumpToIndex,
    isItemLoaded
  } = useInfiniteUsers(500);

  const [activeLetter, setActiveLetter] = useState(null);
  const [letterStats, setLetterStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef(null);

  // Load letter statistics on mount
  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await fetchLetterStats();
        setLetterStats(stats);
      } catch (err) {
        console.error('Failed to load letter stats:', err);
      }
    }
    loadStats();
  }, []);

  // Handle letter click for navigation
  const handleLetterClick = useCallback(async (letter) => {
    try {
      setActiveLetter(letter);
      const result = await jumpToLetter(letter);

      if (result.lineNumber !== undefined) {
        // Load data around the target index first
        await jumpToIndex(result.lineNumber);

        // Small delay to let the virtualizer update
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollToItem(result.lineNumber);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Failed to jump to letter:', err);
    }
  }, [jumpToIndex]);

  // Handle items rendered (for loading data)
  const handleItemsRendered = useCallback((startIndex, stopIndex) => {
    loadUsersInRange(startIndex, stopIndex);
  }, [loadUsersInRange]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">👥</span>
            <h1>User Directory</h1>
          </div>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">
                {totalCount > 0 ? totalCount.toLocaleString() : '—'}
              </span>
              <span className="stat-label">Total Users</span>
            </div>
            {loading && (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {error ? (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <h3>Connection Error</h3>
            <p>{error}</p>
            <p className="error-hint">
              Make sure the backend server is running on port 3001
            </p>
          </div>
        ) : (
          <div className="content-wrapper">
            <div className="list-section">
              <div className="list-header">
                <h2>All Users</h2>
                <p className="list-subtitle">
                  Scroll to browse • Click letters to jump
                </p>
              </div>
              <UserList
                users={users}
                totalCount={totalCount}
                onItemsRendered={handleItemsRendered}
                isItemLoaded={isItemLoaded}
                listRef={listRef}
              />
            </div>
          </div>
        )}
      </main>

      {/* Alphabet Navigation */}
      {!error && totalCount > 0 && (
        <AlphabetNav
          onLetterClick={handleLetterClick}
          activeLetter={activeLetter}
          letterStats={letterStats}
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Built with React + react-window for efficient virtualization
        </p>
      </footer>
    </div>
  );
}

export default App;
