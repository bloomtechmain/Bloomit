"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const pettyCashController_1 = require("../controllers/pettyCashController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Petty cash routes with permission-based authorization
router.post('/replenish', (0, authorize_1.requirePermission)('petty_cash', 'create'), pettyCashController_1.replenishPettyCash);
router.get('/balance', (0, authorize_1.requirePermission)('petty_cash', 'read'), pettyCashController_1.getPettyCashBalance);
router.post('/bill', (0, authorize_1.requirePermission)('petty_cash', 'create'), pettyCashController_1.addPettyCashBill);
router.get('/transactions', (0, authorize_1.requirePermission)('petty_cash', 'read'), pettyCashController_1.getPettyCashTransactions);
exports.default = router;
