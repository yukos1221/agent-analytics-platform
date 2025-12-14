import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { generateRequestId, ErrorResponse } from '../schemas';

const auth = new Hono();

// Test credentials for MVP
// Note: org_id must match seeded data in packages/database/src/seed.ts
const TEST_USER = {
    email: 'admin@test.com',
    password: 'admin123',
    org_id: 'acme123', // Matches seeded sessions in database seed
    user_id: 'user_admin123',
    roles: ['admin'],
};

// JWT Secret - in production this should be from environment
const JWT_SECRET = process.env.JWT_HS256_SECRET || 'dev-jwt-secret-change-in-production';

// Simple JWT creation (HS256)
function createJWT(payload: Record<string, unknown>): string {
    const header = {
        alg: 'HS256',
        typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        ...payload,
        iat: now,
        exp: now + 24 * 60 * 60, // 24 hours
    };

    const encodeBase64Url = (obj: Record<string, unknown>) => {
        const json = JSON.stringify(obj);
        return Buffer.from(json).toString('base64url');
    };

    const headerEncoded = encodeBase64Url(header);
    const payloadEncoded = encodeBase64Url(jwtPayload);

    const signature = createHmac('sha256', JWT_SECRET)
        .update(`${headerEncoded}.${payloadEncoded}`)
        .digest('base64url');

    return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

// Login request schema
const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

type LoginRequest = z.infer<typeof LoginRequestSchema>;

const LoginResponseSchema = z.object({
    token: z.string(),
    user: z.object({
        email: z.string(),
        org_id: z.string(),
        user_id: z.string(),
        roles: z.array(z.string()),
    }),
});

type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 *
 * Test credentials:
 * - email: admin@test.com
 * - password: admin123
 */
auth.post('/login', zValidator('json', LoginRequestSchema), async (c) => {
    const requestId = generateRequestId();
    const body: LoginRequest = c.req.valid('json');

    try {
        // Validate credentials (test user only for MVP)
        if (body.email !== TEST_USER.email || body.password !== TEST_USER.password) {
            const response: ErrorResponse = {
                error: {
                    code: 'AUTH_INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                    documentation_url: 'https://docs.example.com/auth/login',
                },
                request_id: requestId,
            };
            return c.json(response, 401);
        }

        // Create JWT token
        const token = createJWT({
            sub: TEST_USER.user_id,
            email: TEST_USER.email,
            org_id: TEST_USER.org_id,
            custom: {
                org_role: TEST_USER.roles[0],
            },
        });

        const response: LoginResponse = {
            token,
            user: {
                email: TEST_USER.email,
                org_id: TEST_USER.org_id,
                user_id: TEST_USER.user_id,
                roles: TEST_USER.roles,
            },
        };

        return c.json(response, 200);
    } catch (error) {
        const response: ErrorResponse = {
            error: {
                code: 'AUTH_LOGIN_FAILED',
                message: 'Login failed',
                documentation_url: 'https://docs.example.com/auth/login',
            },
            request_id: requestId,
        };
        return c.json(response, 500);
    }
});

export default auth;
