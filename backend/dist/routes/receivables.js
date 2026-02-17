"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const receivableController_1 = require("../controllers/receivableController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Receivables routes with permission-based authorization
router.post('/', (0, authorize_1.requirePermission)('receivables', 'create'), receivableController_1.createReceivable);
router.get('/', (0, authorize_1.requirePermission)('receivables', 'read'), receivableController_1.getReceivables);
exports.default = router;
