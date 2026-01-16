"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("@prisma/client");
const app_1 = __importDefault(require("../src/app"));
const prisma_1 = require("../src/prisma");
const password_1 = require("../src/utils/password");
describe('Auth flows', () => {
    const adminEmail = 'admin@test.com';
    const password = 'Passw0rd!';
    beforeAll(async () => {
        await prisma_1.prisma.submission.deleteMany();
        await prisma_1.prisma.indicator.deleteMany();
        await prisma_1.prisma.logframeNode.deleteMany();
        await prisma_1.prisma.project.deleteMany();
        await prisma_1.prisma.user.deleteMany();
        const passwordHash = await (0, password_1.hashPassword)(password);
        await prisma_1.prisma.user.create({
            data: { email: adminEmail, passwordHash, role: client_1.Role.ADMIN }
        });
    });
    afterAll(async () => {
        await prisma_1.prisma.$disconnect();
    });
    it('logs in and returns access token', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/login').send({ email: adminEmail, password });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(adminEmail);
    });
    it('returns current user via /auth/me', async () => {
        const login = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/login').send({ email: adminEmail, password });
        const token = login.body.token;
        const res = await (0, supertest_1.default)(app_1.default).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(adminEmail);
        expect(res.body.role).toBe(client_1.Role.ADMIN);
    });
});
//# sourceMappingURL=auth.test.js.map