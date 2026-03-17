"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const accountsController_1 = require("../controllers/accountsController");
const debitCardController_1 = require("../controllers/debitCardController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Bank account routes with permission-based authorization
router.post('/open-account', (0, authorize_1.requirePermission)('accounts', 'create'), accountsController_1.openAccount);
router.get('/', (0, authorize_1.requirePermission)('accounts', 'read'), accountsController_1.getAccounts);
router.delete('/:id', (0, authorize_1.requirePermission)('accounts', 'delete'), accountsController_1.deleteAccount);
router.post('/debit-cards', (0, authorize_1.requirePermission)('accounts', 'manage_cards'), debitCardController_1.createDebitCard);
router.get('/debit-cards', (0, authorize_1.requirePermission)('accounts', 'read'), debitCardController_1.getDebitCards);
exports.default = router;
