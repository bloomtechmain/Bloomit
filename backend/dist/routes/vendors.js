"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const vendorController_1 = require("../controllers/vendorController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Vendor routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('vendors', 'read'), vendorController_1.getAllVendors);
router.post('/', (0, authorize_1.requirePermission)('vendors', 'create'), vendorController_1.createVendor);
exports.default = router;
