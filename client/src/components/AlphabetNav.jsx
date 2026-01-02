import { memo } from 'react';
import './AlphabetNav.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Alphabetical navigation sidebar
 * Allows quick jumping to users starting with each letter
 */
function AlphabetNav({ onLetterClick, activeLetter, letterStats }) {
    const getLetterCount = (letter) => {
        if (!letterStats?.letters) return null;
        const stat = letterStats.letters.find(s => s.letter === letter);
        return stat?.count || 0;
    };

    return (
        <nav className="alphabet-nav">
            <div className="alphabet-nav-title">Jump to</div>
            <div className="alphabet-nav-letters">
                {LETTERS.map(letter => {
                    const count = getLetterCount(letter);
                    const isDisabled = count === 0;
                    const isActive = activeLetter === letter;

                    return (
                        <button
                            key={letter}
                            className={`alphabet-nav-letter ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                            onClick={() => !isDisabled && onLetterClick(letter)}
                            disabled={isDisabled}
                            title={count !== null ? `${count.toLocaleString()} users` : 'Loading...'}
                        >
                            {letter}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export default memo(AlphabetNav);
