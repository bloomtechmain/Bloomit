"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteItem = exports.updateItem = exports.createItem = exports.getItemsByProject = void 0;
const db_1 = require("../db");
const getItemsByProject = async (req, res) => {
    const { id } = req.params;
    try {
        const r = await db_1.pool.query('SELECT project_id, requirements, service_category, unit_cost, requirement_type FROM project_items WHERE project_id=$1 ORDER BY requirements DESC', [id]);
        return res.json({ items: r.rows });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.getItemsByProject = getItemsByProject;
const createItem = async (req, res) => {
    const { id } = req.params;
    const { requirements, service_category, unit_cost, requirement_type } = req.body;
    if (!requirements || !service_category || unit_cost === undefined || !requirement_type)
        return res.status(400).json({ error: 'missing_fields' });
    try {
        await db_1.pool.query('BEGIN');
        const insert = await db_1.pool.query(`INSERT INTO project_items(project_id, requirements, service_category, unit_cost, requirement_type)
       VALUES($1,$2,$3,$4,$5) RETURNING project_id, requirements, service_category, unit_cost, requirement_type`, [id, requirements, service_category, unit_cost, requirement_type]);
        if (requirement_type === 'Additional Requirement') {
            await db_1.pool.query('UPDATE projects SET extra_budget_allocation = extra_budget_allocation + $1 WHERE project_id = $2', [unit_cost, id]);
        }
        await db_1.pool.query('COMMIT');
        return res.status(201).json({ item: insert.rows[0] });
    }
    catch (e) {
        await db_1.pool.query('ROLLBACK').catch(() => null);
        const message = e instanceof Error ? e.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.createItem = createItem;
const updateItem = async (req, res) => {
    const { projectId, requirements } = req.params;
    const { service_category, unit_cost, requirement_type } = req.body;
    if (!service_category || unit_cost === undefined || !requirement_type)
        return res.status(400).json({ error: 'missing_fields' });
    try {
        await db_1.pool.query('BEGIN');
        const existing = await db_1.pool.query('SELECT unit_cost, requirement_type FROM project_items WHERE project_id=$1 AND requirements=$2', [projectId, requirements]);
        if (!existing.rows.length) {
            await db_1.pool.query('ROLLBACK');
            return res.status(404).json({ error: 'item_not_found' });
        }
        const oldCost = Number(existing.rows[0].unit_cost || 0);
        const oldReqType = String(existing.rows[0].requirement_type || '');
        const newCost = Number(unit_cost);
        const oldContribution = oldReqType === 'Additional Requirement' ? oldCost : 0;
        const newContribution = requirement_type === 'Additional Requirement' ? newCost : 0;
        const delta = newContribution - oldContribution;
        const updated = await db_1.pool.query(`UPDATE project_items SET service_category=$1, unit_cost=$2, requirement_type=$3 WHERE project_id=$4 AND requirements=$5 RETURNING project_id, requirements, service_category, unit_cost, requirement_type`, [service_category, unit_cost, requirement_type, projectId, requirements]);
        if (delta !== 0) {
            await db_1.pool.query('UPDATE projects SET extra_budget_allocation = extra_budget_allocation + $1 WHERE project_id = $2', [delta, projectId]);
        }
        await db_1.pool.query('COMMIT');
        return res.json({ item: updated.rows[0] });
    }
    catch (e) {
        await db_1.pool.query('ROLLBACK').catch(() => null);
        const message = e instanceof Error ? e.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.updateItem = updateItem;
const deleteItem = async (req, res) => {
    const { projectId, requirements } = req.params;
    try {
        await db_1.pool.query('BEGIN');
        const existing = await db_1.pool.query('SELECT unit_cost, requirement_type FROM project_items WHERE project_id=$1 AND requirements=$2', [projectId, requirements]);
        if (!existing.rows.length) {
            await db_1.pool.query('ROLLBACK');
            return res.status(404).json({ error: 'item_not_found' });
        }
        const oldCost = Number(existing.rows[0].unit_cost || 0);
        const oldReqType = String(existing.rows[0].requirement_type || '');
        await db_1.pool.query('DELETE FROM project_items WHERE project_id=$1 AND requirements=$2', [projectId, requirements]);
        if (oldReqType === 'Additional Requirement') {
            await db_1.pool.query('UPDATE projects SET extra_budget_allocation = extra_budget_allocation - $1 WHERE project_id = $2', [oldCost, projectId]);
        }
        await db_1.pool.query('COMMIT');
        return res.json({ deleted: 1 });
    }
    catch (e) {
        await db_1.pool.query('ROLLBACK').catch(() => null);
        const message = e instanceof Error ? e.message : 'server_error';
        return res.status(500).json({ error: message });
    }
};
exports.deleteItem = deleteItem;
