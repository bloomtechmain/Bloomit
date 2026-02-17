"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const timeEntriesController_1 = require("../controllers/timeEntriesController");
const router = (0, express_1.Router)();
// Time entry CRUD
router.get('/my-entries', auth_1.requireAuth, timeEntriesController_1.getMyTimeEntries);
router.post('/', auth_1.requireAuth, timeEntriesController_1.createTimeEntry);
router.put('/:id', auth_1.requireAuth, timeEntriesController_1.updateTimeEntry);
router.delete('/:id', auth_1.requireAuth, timeEntriesController_1.deleteTimeEntry);
// Timer operations
router.post('/timer/start', auth_1.requireAuth, timeEntriesController_1.startTimer);
router.get('/timer/active/:employeeId', auth_1.requireAuth, timeEntriesController_1.getActiveTimer);
router.post('/timer/pause', auth_1.requireAuth, timeEntriesController_1.pauseTimer);
router.post('/timer/resume', auth_1.requireAuth, timeEntriesController_1.resumeTimer);
router.post('/timer/stop', auth_1.requireAuth, timeEntriesController_1.stopTimer);
// Manager operations
router.get('/pending', auth_1.requireAuth, timeEntriesController_1.getPendingTimeEntries);
router.put('/:id/approve', auth_1.requireAuth, timeEntriesController_1.approveTimeEntry);
router.put('/:id/reject', auth_1.requireAuth, timeEntriesController_1.rejectTimeEntry);
// Statistics
router.get('/summary', auth_1.requireAuth, timeEntriesController_1.getTimeSummary);
exports.default = router;
