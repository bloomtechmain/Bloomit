"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const payableController_1 = require("../controllers/payableController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Payables routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('payables', 'read'), payableController_1.getAllPayables);
router.post('/', (0, authorize_1.requirePermission)('payables', 'create'), payableController_1.createPayable);
exports.default = router;
