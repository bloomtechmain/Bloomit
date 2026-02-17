"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const assetsController_1 = require("../controllers/assetsController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Assets routes with permission-based authorization
router.get('/', (0, authorize_1.requirePermission)('assets', 'read'), assetsController_1.getAssets);
router.post('/', (0, authorize_1.requirePermission)('assets', 'create'), assetsController_1.createAsset);
router.get('/:id/depreciation-schedule', (0, authorize_1.requirePermission)('assets', 'read'), assetsController_1.getDepreciationSchedule);
exports.default = router;
