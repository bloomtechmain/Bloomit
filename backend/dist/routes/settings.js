"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const settingsController_1 = require("../controllers/settingsController");
const router = (0, express_1.Router)();
// All settings routes require authentication
router.use(auth_1.requireAuth);
// GET /api/settings - Get all settings (anyone can view)
router.get('/', settingsController_1.getSettings);
// GET /api/settings/:key - Get specific setting (anyone can view)
router.get('/:key', settingsController_1.getSettingByKey);
// PUT /api/settings/:key - Update setting (requires settings:manage permission)
router.put('/:key', (0, authorize_1.requirePermission)('settings', 'manage'), settingsController_1.updateSetting);
// POST /api/settings - Create new setting (requires settings:manage permission)
router.post('/', (0, authorize_1.requirePermission)('settings', 'manage'), settingsController_1.createSetting);
exports.default = router;
