"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const analyticsController_1 = require("../controllers/analyticsController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Analytics routes with permission-based authorization
router.get('/summary', (0, authorize_1.requirePermission)('analytics', 'read'), analyticsController_1.getAnalyticsSummary);
router.get('/project-profitability', (0, authorize_1.requirePermission)('analytics', 'read'), analyticsController_1.getProjectProfitability);
router.get('/ar-aging', (0, authorize_1.requirePermission)('analytics', 'read'), analyticsController_1.getARAgingReport);
router.get('/recurring-revenue', (0, authorize_1.requirePermission)('analytics', 'read'), analyticsController_1.getRecurringRevenue);
router.get('/pipeline', (0, authorize_1.requirePermission)('analytics', 'read'), analyticsController_1.getSalesPipeline);
router.get('/profit-loss', (0, authorize_1.requirePermission)('analytics', 'read'), analyticsController_1.getProfitLoss);
exports.default = router;
