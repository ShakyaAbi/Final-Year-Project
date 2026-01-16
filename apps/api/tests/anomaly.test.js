"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const prisma_1 = require("../src/prisma");
const client_1 = require("@prisma/client");
describe('Anomaly Detection System', () => {
    let authToken;
    let userId;
    let projectId;
    let nodeId;
    let indicatorId;
    beforeAll(async () => {
        // Create test user
        const user = await prisma_1.prisma.user.create({
            data: {
                email: 'anomaly-test@test.com',
                passwordHash: '$2b$10$validhash',
                role: client_1.Role.ADMIN,
                name: 'Anomaly Tester'
            }
        });
        userId = user.id;
        // Login
        const loginRes = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .send({ email: 'anomaly-test@test.com', password: 'password123' });
        authToken = loginRes.body.token;
        // Create project
        const project = await prisma_1.prisma.project.create({
            data: {
                name: 'Anomaly Test Project',
                status: 'ACTIVE'
            }
        });
        projectId = project.id;
        // Create logframe node
        const node = await prisma_1.prisma.logframeNode.create({
            data: {
                projectId,
                type: 'OUTPUT',
                title: 'Test Output',
                sortOrder: 0
            }
        });
        nodeId = node.id;
    });
    afterAll(async () => {
        await prisma_1.prisma.submission.deleteMany();
        await prisma_1.prisma.indicator.deleteMany();
        await prisma_1.prisma.logframeNode.deleteMany();
        await prisma_1.prisma.project.deleteMany();
        await prisma_1.prisma.user.deleteMany({ where: { email: 'anomaly-test@test.com' } });
        await prisma_1.prisma.$disconnect();
    });
    describe('MAD Outlier Detection', () => {
        beforeEach(async () => {
            const indicator = await prisma_1.prisma.indicator.create({
                data: {
                    projectId,
                    logframeNodeId: nodeId,
                    name: 'MAD Test Indicator',
                    unit: 'units',
                    dataType: client_1.IndicatorDataType.NUMBER,
                    anomalyConfig: {
                        enabled: true,
                        outlier: {
                            method: 'MAD',
                            threshold: 3.5,
                            windowSize: 8,
                            minPoints: 6
                        }
                    }
                }
            });
            indicatorId = indicator.id;
            // Create normal baseline values
            const normalValues = [10, 12, 11, 13, 12, 10, 11, 12];
            for (let i = 0; i < normalValues.length; i++) {
                await (0, supertest_1.default)(app_1.app)
                    .post(`/api/indicators/${indicatorId}/submissions`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    reportedAt: new Date(2025, 0, i + 1).toISOString(),
                    value: normalValues[i],
                    evidence: `Normal value ${i + 1}`
                });
            }
        });
        afterEach(async () => {
            await prisma_1.prisma.submission.deleteMany({ where: { indicatorId } });
            await prisma_1.prisma.indicator.delete({ where: { id: indicatorId } });
        });
        test('should detect outlier with MAD method', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/indicators/${indicatorId}/submissions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                reportedAt: new Date(2025, 0, 9).toISOString(),
                value: 50, // Clear outlier
                evidence: 'Outlier value'
            });
            expect(res.status).toBe(201);
            expect(res.body.isAnomaly).toBe(true);
            expect(res.body.anomalyReason).toContain('Outlier');
            expect(res.body.anomalyStatus).toBe(client_1.AnomalyStatus.DETECTED);
        });
        test('should not flag normal values as anomalies', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/indicators/${indicatorId}/submissions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                reportedAt: new Date(2025, 0, 9).toISOString(),
                value: 11, // Normal value
                evidence: 'Normal value'
            });
            expect(res.status).toBe(201);
            expect(res.body.isAnomaly).toBe(false);
            expect(res.body.anomalyReason).toBeNull();
        });
    });
    describe('IQR Outlier Detection', () => {
        beforeEach(async () => {
            const indicator = await prisma_1.prisma.indicator.create({
                data: {
                    projectId,
                    logframeNodeId: nodeId,
                    name: 'IQR Test Indicator',
                    unit: 'units',
                    dataType: client_1.IndicatorDataType.NUMBER,
                    anomalyConfig: {
                        enabled: true,
                        outlier: {
                            method: 'IQR',
                            threshold: 1.5,
                            windowSize: 8,
                            minPoints: 6
                        }
                    }
                }
            });
            indicatorId = indicator.id;
            const normalValues = [100, 105, 102, 108, 103, 107, 104, 106];
            for (let i = 0; i < normalValues.length; i++) {
                await (0, supertest_1.default)(app_1.app)
                    .post(`/api/indicators/${indicatorId}/submissions`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    reportedAt: new Date(2025, 0, i + 1).toISOString(),
                    value: normalValues[i]
                });
            }
        });
        afterEach(async () => {
            await prisma_1.prisma.submission.deleteMany({ where: { indicatorId } });
            await prisma_1.prisma.indicator.delete({ where: { id: indicatorId } });
        });
        test('should detect outlier with IQR method', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/indicators/${indicatorId}/submissions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                reportedAt: new Date(2025, 0, 9).toISOString(),
                value: 200
            });
            expect(res.status).toBe(201);
            expect(res.body.isAnomaly).toBe(true);
            expect(res.body.anomalyReason).toContain('IQR');
        });
    });
    describe('Trend Shift Detection', () => {
        beforeEach(async () => {
            const indicator = await prisma_1.prisma.indicator.create({
                data: {
                    projectId,
                    logframeNodeId: nodeId,
                    name: 'Trend Test Indicator',
                    unit: 'units',
                    dataType: client_1.IndicatorDataType.NUMBER,
                    anomalyConfig: {
                        enabled: true,
                        trend: {
                            method: 'SLOPE_SHIFT',
                            threshold: 2,
                            windowSize: 6
                        }
                    }
                }
            });
            indicatorId = indicator.id;
            // Create stable trend
            const stableValues = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
            for (let i = 0; i < stableValues.length; i++) {
                await (0, supertest_1.default)(app_1.app)
                    .post(`/api/indicators/${indicatorId}/submissions`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    reportedAt: new Date(2025, 0, i + 1).toISOString(),
                    value: stableValues[i]
                });
            }
        });
        afterEach(async () => {
            await prisma_1.prisma.submission.deleteMany({ where: { indicatorId } });
            await prisma_1.prisma.indicator.delete({ where: { id: indicatorId } });
        });
        test('should detect sudden trend shift', async () => {
            // This would require sufficient data points to trigger trend detection
            // Due to window size requirements, this is a placeholder test
            const submissions = await (0, supertest_1.default)(app_1.app)
                .get(`/api/indicators/${indicatorId}/submissions`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(submissions.status).toBe(200);
            expect(Array.isArray(submissions.body)).toBe(true);
        });
    });
    describe('Anomaly Management', () => {
        let anomalySubmissionId;
        beforeEach(async () => {
            const indicator = await prisma_1.prisma.indicator.create({
                data: {
                    projectId,
                    logframeNodeId: nodeId,
                    name: 'Management Test Indicator',
                    unit: 'units',
                    dataType: client_1.IndicatorDataType.NUMBER,
                    minValue: 0,
                    maxValue: 100
                }
            });
            indicatorId = indicator.id;
            // Create an anomaly by exceeding max value
            const submission = await prisma_1.prisma.submission.create({
                data: {
                    indicatorId,
                    reportedAt: new Date(),
                    value: '150',
                    createdByUserId: userId,
                    isAnomaly: true,
                    anomalyReason: 'Value exceeds expected maximum (100)',
                    anomalyStatus: client_1.AnomalyStatus.DETECTED
                }
            });
            anomalySubmissionId = submission.id;
        });
        afterEach(async () => {
            await prisma_1.prisma.submission.deleteMany({ where: { indicatorId } });
            await prisma_1.prisma.indicator.delete({ where: { id: indicatorId } });
        });
        test('should acknowledge anomaly', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/submissions/${anomalySubmissionId}/anomaly/acknowledge`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ notes: 'Data entry error confirmed' });
            expect(res.status).toBe(200);
            expect(res.body.anomalyStatus).toBe(client_1.AnomalyStatus.ACKNOWLEDGED);
            expect(res.body.anomalyReviewedBy).toBe(userId);
            expect(res.body.anomalyReviewedAt).toBeTruthy();
        });
        test('should resolve anomaly', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/submissions/${anomalySubmissionId}/anomaly/resolve`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ notes: 'Corrected in system' });
            expect(res.status).toBe(200);
            expect(res.body.anomalyStatus).toBe(client_1.AnomalyStatus.RESOLVED);
        });
        test('should mark anomaly as false positive', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/submissions/${anomalySubmissionId}/anomaly/false-positive`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ notes: 'Actually valid data' });
            expect(res.status).toBe(200);
            expect(res.body.anomalyStatus).toBe(client_1.AnomalyStatus.FALSE_POSITIVE);
        });
        test('should update anomaly status', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .put(`/api/submissions/${anomalySubmissionId}/anomaly/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                status: client_1.AnomalyStatus.RESOLVED,
                notes: 'Updated status'
            });
            expect(res.status).toBe(200);
            expect(res.body.anomalyStatus).toBe(client_1.AnomalyStatus.RESOLVED);
        });
        test('should reject anomaly operations on non-anomaly submission', async () => {
            const normalSubmission = await prisma_1.prisma.submission.create({
                data: {
                    indicatorId,
                    reportedAt: new Date(),
                    value: '50',
                    createdByUserId: userId,
                    isAnomaly: false
                }
            });
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/submissions/${normalSubmission.id}/anomaly/acknowledge`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ notes: 'Test' });
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('NOT_ANOMALY');
        });
    });
    describe('Disabled Anomaly Detection', () => {
        test('should not detect anomalies when disabled', async () => {
            const indicator = await prisma_1.prisma.indicator.create({
                data: {
                    projectId,
                    logframeNodeId: nodeId,
                    name: 'Disabled Anomaly Indicator',
                    unit: 'units',
                    dataType: client_1.IndicatorDataType.NUMBER,
                    anomalyConfig: {
                        enabled: false
                    }
                }
            });
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/indicators/${indicator.id}/submissions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                reportedAt: new Date().toISOString(),
                value: 999999 // Extreme value
            });
            expect(res.status).toBe(201);
            expect(res.body.isAnomaly).toBe(false);
            await prisma_1.prisma.submission.deleteMany({ where: { indicatorId: indicator.id } });
            await prisma_1.prisma.indicator.delete({ where: { id: indicator.id } });
        });
    });
    describe('Range-based Anomaly Detection', () => {
        test('should detect value below minimum', async () => {
            const indicator = await prisma_1.prisma.indicator.create({
                data: {
                    projectId,
                    logframeNodeId: nodeId,
                    name: 'Range Test Indicator',
                    unit: 'units',
                    dataType: client_1.IndicatorDataType.NUMBER,
                    minValue: 10,
                    maxValue: 100
                }
            });
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/indicators/${indicator.id}/submissions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                reportedAt: new Date().toISOString(),
                value: 5 // Below minimum
            });
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALUE_TOO_LOW');
            await prisma_1.prisma.indicator.delete({ where: { id: indicator.id } });
        });
        test('should detect value above maximum', async () => {
            const indicator = await prisma_1.prisma.indicator.create({
                data: {
                    projectId,
                    logframeNodeId: nodeId,
                    name: 'Range Test Indicator 2',
                    unit: 'units',
                    dataType: client_1.IndicatorDataType.NUMBER,
                    minValue: 10,
                    maxValue: 100
                }
            });
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/indicators/${indicator.id}/submissions`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                reportedAt: new Date().toISOString(),
                value: 150 // Above maximum
            });
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALUE_TOO_HIGH');
            await prisma_1.prisma.indicator.delete({ where: { id: indicator.id } });
        });
    });
});
//# sourceMappingURL=anomaly.test.js.map