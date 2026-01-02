import express from 'express';
import { getUsersPaginated, jumpToLetter, getTotalCount, getLetterStats } from '../utils/fileStreamer.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/users?offset=0&limit=100
 * Paginated user list with efficient file streaming
 */
router.get('/', async (req, res) => {
    try {
        const offset = parseInt(req.query.offset) || 0;
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Max 1000 per request

        const startTime = Date.now();
        const result = await getUsersPaginated(offset, limit);
        const duration = Date.now() - startTime;

        logger.debug('Users fetched', { offset, limit, count: result.users.length, duration: `${duration}ms` });

        res.json(result);
    } catch (error) {
        logger.error('Error fetching users', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/users/count
 * Total number of users in the dataset
 */
router.get('/count', async (req, res) => {
    try {
        const count = await getTotalCount();
        logger.debug('Count retrieved', { count });
        res.json({ count });
    } catch (error) {
        logger.error('Error getting count', { error: error.message });
        res.status(500).json({ error: 'Failed to get count' });
    }
});

/**
 * GET /api/users/letters
 * Get available letters and their line positions for quick navigation
 */
router.get('/letters', async (req, res) => {
    try {
        const stats = await getLetterStats();
        logger.debug('Letter stats retrieved', { letterCount: stats.letters.length });
        res.json(stats);
    } catch (error) {
        logger.error('Error getting letter stats', { error: error.message });
        res.status(500).json({ error: 'Failed to get letter stats' });
    }
});

/**
 * GET /api/users/jump/:letter
 * Jump to first user starting with the given letter
 */
router.get('/jump/:letter', async (req, res) => {
    try {
        const letter = req.params.letter.toUpperCase();
        if (!/^[A-Z]$/.test(letter)) {
            logger.warn('Invalid letter requested', { letter: req.params.letter });
            return res.status(400).json({ error: 'Invalid letter' });
        }

        const result = await jumpToLetter(letter);
        logger.debug('Jump to letter', { letter, lineNumber: result.lineNumber, exact: result.exact });
        res.json(result);
    } catch (error) {
        logger.error('Error jumping to letter', { error: error.message });
        res.status(500).json({ error: 'Failed to jump to letter' });
    }
});

export default router;
