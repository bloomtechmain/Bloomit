"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const subscriptionsController_1 = require("../controllers/subscriptionsController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Subscriptions routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('subscriptions', 'read'), subscriptionsController_1.getAllSubscriptions);
router.get('/:id', (0, authorize_1.requirePermission)('subscriptions', 'read'), subscriptionsController_1.getSubscriptionById);
router.post('/', (0, authorize_1.requirePermission)('subscriptions', 'create'), subscriptionsController_1.createSubscription);
router.put('/:id', (0, authorize_1.requirePermission)('subscriptions', 'update'), subscriptionsController_1.updateSubscription);
router.delete('/:id', (0, authorize_1.requirePermission)('subscriptions', 'delete'), subscriptionsController_1.deleteSubscription);
exports.default = router;
