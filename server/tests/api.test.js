/**
 * API Tests for the Large User List Application
 * Tests all endpoints for correct behavior
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import usersRouter from '../src/routes/users.js';

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/users', usersRouter);

describe('User API Endpoints', () => {

    describe('GET /api/users', () => {

        it('should return paginated users with default limit', async () => {
            const response = await request(app)
                .get('/api/users')
                .expect(200);

            expect(response.body).toHaveProperty('users');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('offset');
            expect(response.body).toHaveProperty('limit');
            expect(response.body).toHaveProperty('hasMore');
            expect(Array.isArray(response.body.users)).toBe(true);
        });

        it('should respect offset and limit parameters', async () => {
            const response = await request(app)
                .get('/api/users?offset=10&limit=5')
                .expect(200);

            expect(response.body.offset).toBe(10);
            expect(response.body.limit).toBe(5);
            expect(response.body.users.length).toBeLessThanOrEqual(5);
        });

        it('should cap limit at 1000', async () => {
            const response = await request(app)
                .get('/api/users?limit=5000')
                .expect(200);

            expect(response.body.limit).toBe(1000);
        });

        it('should return users with id and name properties', async () => {
            const response = await request(app)
                .get('/api/users?limit=1')
                .expect(200);

            if (response.body.users.length > 0) {
                expect(response.body.users[0]).toHaveProperty('id');
                expect(response.body.users[0]).toHaveProperty('name');
            }
        });
    });

    describe('GET /api/users/count', () => {

        it('should return total user count', async () => {
            const response = await request(app)
                .get('/api/users/count')
                .expect(200);

            expect(response.body).toHaveProperty('count');
            expect(typeof response.body.count).toBe('number');
            expect(response.body.count).toBeGreaterThan(0);
        });
    });

    describe('GET /api/users/letters', () => {

        it('should return letter statistics', async () => {
            const response = await request(app)
                .get('/api/users/letters')
                .expect(200);

            expect(response.body).toHaveProperty('letters');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.letters)).toBe(true);
        });

        it('should have letter, startLine, and count for each entry', async () => {
            const response = await request(app)
                .get('/api/users/letters')
                .expect(200);

            if (response.body.letters.length > 0) {
                const firstLetter = response.body.letters[0];
                expect(firstLetter).toHaveProperty('letter');
                expect(firstLetter).toHaveProperty('startLine');
                expect(firstLetter).toHaveProperty('count');
            }
        });
    });

    describe('GET /api/users/jump/:letter', () => {

        it('should return line number for valid letter', async () => {
            const response = await request(app)
                .get('/api/users/jump/A')
                .expect(200);

            expect(response.body).toHaveProperty('letter');
            expect(response.body).toHaveProperty('lineNumber');
            expect(response.body.letter).toBe('A');
        });

        it('should handle lowercase letters', async () => {
            const response = await request(app)
                .get('/api/users/jump/a')
                .expect(200);

            expect(response.body.letter).toBe('A');
        });

        it('should reject invalid letters', async () => {
            const response = await request(app)
                .get('/api/users/jump/1')
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should find nearest letter for missing letters', async () => {
            const response = await request(app)
                .get('/api/users/jump/Z')
                .expect(200);

            expect(response.body).toHaveProperty('lineNumber');
        });
    });
});
