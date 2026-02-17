"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodoShares = exports.unshareTodo = exports.shareTodo = exports.deleteTodo = exports.updateTodo = exports.createTodo = exports.getTodos = void 0;
const db_1 = require("../db");
// Get all todos for a user (including shared todos)
const getTodos = async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        const result = await db_1.pool.query(`
      SELECT DISTINCT t.id, t.user_id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at, t.updated_at,
        u.name as owner_name,
        CASE 
          WHEN t.user_id = $1 THEN 'owner'
          ELSE ts.permission
        END as access_level,
        CASE t.status 
          WHEN 'pending' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'completed' THEN 3
        END as status_order,
        CASE t.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END as priority_order
      FROM todos t
      LEFT JOIN todo_shares ts ON t.id = ts.todo_id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.user_id = $1 OR ts.shared_with_user_id = $1
      ORDER BY 
        status_order,
        priority_order,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
      `, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
};
exports.getTodos = getTodos;
// Create a new todo
const createTodo = async (req, res) => {
    try {
        const { user_id, title, description, status, priority, due_date } = req.body;
        if (!user_id || !title) {
            return res.status(400).json({ error: 'user_id and title are required' });
        }
        const result = await db_1.pool.query(`
      INSERT INTO todos (user_id, title, description, status, priority, due_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `, [
            user_id,
            title,
            description || '',
            status || 'pending',
            priority || 'medium',
            due_date || null
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating todo:', error);
        res.status(500).json({ error: 'Failed to create todo' });
    }
};
exports.createTodo = createTodo;
// Update a todo
const updateTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, title, description, status, priority, due_date } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        // Check if user has write permission
        const permCheck = await db_1.pool.query(`
      SELECT t.user_id, ts.permission
      FROM todos t
      LEFT JOIN todo_shares ts ON t.id = ts.todo_id AND ts.shared_with_user_id = $1
      WHERE t.id = $2
      `, [user_id, id]);
        if (permCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        const isOwner = permCheck.rows[0].user_id == user_id;
        const hasWriteAccess = permCheck.rows[0].permission === 'write';
        if (!isOwner && !hasWriteAccess) {
            return res.status(403).json({ error: 'No permission to edit this todo' });
        }
        const result = await db_1.pool.query(`
      UPDATE todos
      SET title = $1, description = $2, status = $3, priority = $4, due_date = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
      `, [title, description, status, priority, due_date, id]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating todo:', error);
        res.status(500).json({ error: 'Failed to update todo' });
    }
};
exports.updateTodo = updateTodo;
// Delete a todo
const deleteTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        const result = await db_1.pool.query(`
      DELETE FROM todos
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Todo not found or no permission' });
        }
        res.json({ message: 'Todo deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting todo:', error);
        res.status(500).json({ error: 'Failed to delete todo' });
    }
};
exports.deleteTodo = deleteTodo;
// Share a todo with another user
const shareTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, shared_with_user_id, permission } = req.body;
        if (!user_id || !shared_with_user_id) {
            return res.status(400).json({ error: 'user_id and shared_with_user_id are required' });
        }
        // Check if user owns the todo
        const todoCheck = await db_1.pool.query('SELECT user_id FROM todos WHERE id = $1', [id]);
        if (todoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        if (todoCheck.rows[0].user_id != user_id) {
            return res.status(403).json({ error: 'Only the owner can share todos' });
        }
        const result = await db_1.pool.query(`
      INSERT INTO todo_shares (todo_id, shared_with_user_id, permission)
      VALUES ($1, $2, $3)
      ON CONFLICT (todo_id, shared_with_user_id) 
      DO UPDATE SET permission = $3
      RETURNING *
      `, [id, shared_with_user_id, permission || 'read']);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error sharing todo:', error);
        res.status(500).json({ error: 'Failed to share todo' });
    }
};
exports.shareTodo = shareTodo;
// Remove share access
const unshareTodo = async (req, res) => {
    try {
        const { id, shareId } = req.params;
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        // Check if user owns the todo
        const todoCheck = await db_1.pool.query('SELECT user_id FROM todos WHERE id = $1', [id]);
        if (todoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        if (todoCheck.rows[0].user_id != userId) {
            return res.status(403).json({ error: 'Only the owner can manage shares' });
        }
        await db_1.pool.query('DELETE FROM todo_shares WHERE id = $1 AND todo_id = $2', [shareId, id]);
        res.json({ message: 'Share removed successfully' });
    }
    catch (error) {
        console.error('Error removing share:', error);
        res.status(500).json({ error: 'Failed to remove share' });
    }
};
exports.unshareTodo = unshareTodo;
// Get shares for a todo
const getTodoShares = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        // Check if user owns the todo
        const todoCheck = await db_1.pool.query('SELECT user_id FROM todos WHERE id = $1', [id]);
        if (todoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }
        if (todoCheck.rows[0].user_id != userId) {
            return res.status(403).json({ error: 'Only the owner can view shares' });
        }
        const result = await db_1.pool.query(`SELECT ts.id, ts.todo_id, ts.shared_with_user_id, ts.permission, ts.created_at,
              u.name as user_name, u.email as user_email
       FROM todo_shares ts
       JOIN users u ON ts.shared_with_user_id = u.id
       WHERE ts.todo_id = $1
       ORDER BY u.name`, [id]);
        res.json({ shares: result.rows });
    }
    catch (error) {
        console.error('Error fetching todo shares:', error);
        res.status(500).json({ error: 'Failed to fetch todo shares' });
    }
};
exports.getTodoShares = getTodoShares;
