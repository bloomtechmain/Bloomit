"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function addReceiptDocumentIdToPurchaseOrders() {
    const client = await db_1.pool.connect();
    try {
        console.log('🔄 Adding receipt_document_id column to purchase_orders table...');
        await client.query('BEGIN');
        // Add receipt_document_id column if it doesn't exist
        await client.query(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS receipt_document_id INTEGER REFERENCES documents(id)
    `);
        // Create index for performance
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_po_receipt_document ON purchase_orders(receipt_document_id)
    `);
        await client.query('COMMIT');
        console.log('✅ receipt_document_id column added successfully');
        console.log('✅ Index created successfully');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error adding receipt_document_id column:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    addReceiptDocumentIdToPurchaseOrders()
        .then(() => {
        console.log('✅ Migration complete');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
}
exports.default = addReceiptDocumentIdToPurchaseOrders;
