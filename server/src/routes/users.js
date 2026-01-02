import express from 'express';
import { getUsersPaginated, jumpToLetter, getTotalCount, getLetterStats } from '../utils/fileStreamer.js';

const router = express.Router();

/**
 * GET /api/users?offset=0&limit=100
 * Paginated user list with efficient file streaming
 */
router.get('/', async (req, res) => {
    try {
        const offset = parseInt(req.query.offset) || 0;
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Max 1000 per request

        const result = await getUsersPaginated(offset, limit);
        res.json(result);
    } catch (error) {
        console.error('Error fetching users:', error);
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
        res.json({ count });
    } catch (error) {
        console.error('Error getting count:', error);
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
        res.json(stats);
    } catch (error) {
        console.error('Error getting letter stats:', error);
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
            return res.status(400).json({ error: 'Invalid letter' });
        }

        const result = await jumpToLetter(letter);
        res.json(result);
    } catch (error) {
        console.error('Error jumping to letter:', error);
        res.status(500).json({ error: 'Failed to jump to letter' });
    }
});

export default router;
