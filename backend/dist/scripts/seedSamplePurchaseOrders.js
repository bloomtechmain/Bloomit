"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function seedSamplePurchaseOrders() {
    const client = await db_1.pool.connect();
    try {
        console.log('🌱 Seeding sample purchase orders...\n');
        await client.query('BEGIN');
        // Get the first user ID for testing
        const userResult = await client.query('SELECT id, name FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            throw new Error('No users found in database. Please seed users first.');
        }
        const user = userResult.rows[0];
        const userTitle = 'Manager'; // Default title since users table doesn't have this field
        // Get a vendor ID for testing
        const vendorResult = await client.query('SELECT vendor_id FROM vendors LIMIT 1');
        if (vendorResult.rows.length === 0) {
            console.log('⚠️  No vendors found. Skipping vendor association.');
        }
        const vendorId = vendorResult.rows.length > 0 ? vendorResult.rows[0].vendor_id : null;
        // Get a project ID for testing
        const projectResult = await client.query('SELECT contract_id FROM contracts LIMIT 1');
        if (projectResult.rows.length === 0) {
            console.log('⚠️  No projects found. Skipping project association.');
        }
        const projectId = projectResult.rows.length > 0 ? projectResult.rows[0].contract_id : null;
        // Sample PO 1: Pending Purchase Order
        const po1 = await client.query(`
      INSERT INTO purchase_orders (
        po_number,
        requested_by_user_id,
        requested_by_name,
        requested_by_title,
        vendor_id,
        project_id,
        subtotal,
        sales_tax,
        shipping_handling,
        total_amount,
        payment_method,
        status,
        notes
      ) VALUES (
        'PO-2026-0001',
        $1,
        $2,
        $3,
        $4,
        $5,
        2500.00,
        250.00,
        50.00,
        2800.00,
        'Credit Card',
        'PENDING',
        'Office supplies for Q1 2026 - Desks, chairs, and filing cabinets'
      ) RETURNING id
    `, [user.id, user.name, userTitle, vendorId, projectId]);
        // Add line items for PO 1
        await client.query(`
      INSERT INTO purchase_order_items (
        purchase_order_id,
        quantity,
        description,
        unit_price,
        total,
        line_order
      ) VALUES
      ($1, 5, 'Ergonomic Office Chair', 250.00, 1250.00, 1),
      ($1, 3, 'Height Adjustable Desk', 350.00, 1050.00, 2),
      ($1, 10, 'Filing Cabinet (4-drawer)', 20.00, 200.00, 3)
    `, [po1.rows[0].id]);
        console.log('✅ Created PO-2026-0001 (PENDING) with 3 line items');
        // Sample PO 2: Approved Purchase Order
        const po2 = await client.query(`
      INSERT INTO purchase_orders (
        po_number,
        requested_by_user_id,
        requested_by_name,
        requested_by_title,
        vendor_id,
        project_id,
        subtotal,
        sales_tax,
        shipping_handling,
        total_amount,
        payment_method,
        status,
        approved_by_user_id,
        approved_by_name,
        approved_by_title,
        approved_at,
        notes
      ) VALUES (
        'PO-2026-0002',
        $1,
        $2,
        $3,
        $4,
        $5,
        4500.00,
        450.00,
        100.00,
        5050.00,
        'Wire Transfer',
        'APPROVED',
        $1,
        $2,
        $3,
        NOW() - INTERVAL '2 days',
        'Computer equipment for new employees'
      ) RETURNING id
    `, [user.id, user.name, userTitle, vendorId, projectId]);
        // Add line items for PO 2
        await client.query(`
      INSERT INTO purchase_order_items (
        purchase_order_id,
        quantity,
        description,
        unit_price,
        total,
        line_order
      ) VALUES
      ($1, 3, 'Dell Laptop - 16GB RAM, 512GB SSD', 1200.00, 3600.00, 1),
      ($1, 3, '27" Monitor - 4K Display', 300.00, 900.00, 2)
    `, [po2.rows[0].id]);
        console.log('✅ Created PO-2026-0002 (APPROVED) with 2 line items');
        // Sample PO 3: Rejected Purchase Order
        const po3 = await client.query(`
      INSERT INTO purchase_orders (
        po_number,
        requested_by_user_id,
        requested_by_name,
        requested_by_title,
        vendor_id,
        project_id,
        subtotal,
        sales_tax,
        total_amount,
        payment_method,
        status,
        approved_by_user_id,
        approved_by_name,
        approved_by_title,
        approved_at,
        rejection_reason,
        notes
      ) VALUES (
        'PO-2026-0003',
        $1,
        $2,
        $3,
        $4,
        $5,
        15000.00,
        1500.00,
        16500.00,
        'Check',
        'REJECTED',
        $1,
        $2,
        $3,
        NOW() - INTERVAL '1 day',
        'Budget exceeded for this quarter. Please resubmit with lower cost alternatives or wait until next quarter.',
        'Premium office furniture upgrade - Standing desks and premium chairs'
      ) RETURNING id
    `, [user.id, user.name, userTitle, vendorId, projectId]);
        // Add line items for PO 3
        await client.query(`
      INSERT INTO purchase_order_items (
        purchase_order_id,
        quantity,
        description,
        unit_price,
        total,
        line_order
      ) VALUES
      ($1, 10, 'Premium Standing Desk - Dual Motor', 800.00, 8000.00, 1),
      ($1, 10, 'Herman Miller Aeron Chair', 700.00, 7000.00, 2)
    `, [po3.rows[0].id]);
        console.log('✅ Created PO-2026-0003 (REJECTED) with 2 line items');
        // Sample PO 4: Paid Purchase Order
        const po4 = await client.query(`
      INSERT INTO purchase_orders (
        po_number,
        requested_by_user_id,
        requested_by_name,
        requested_by_title,
        vendor_id,
        project_id,
        subtotal,
        sales_tax,
        shipping_handling,
        banking_fee,
        total_amount,
        payment_method,
        check_number,
        payment_amount,
        payment_date,
        status,
        approved_by_user_id,
        approved_by_name,
        approved_by_title,
        approved_at,
        receipt_document_url,
        receipt_uploaded_at,
        notes
      ) VALUES (
        'PO-2026-0004',
        $1,
        $2,
        $3,
        $4,
        $5,
        1200.00,
        120.00,
        25.00,
        5.00,
        1350.00,
        'Check',
        'CHK-00456',
        1350.00,
        NOW() - INTERVAL '1 day',
        'PAID',
        $1,
        $2,
        $3,
        NOW() - INTERVAL '5 days',
        '/documents/receipts/po-2026-0004-receipt.pdf',
        NOW() - INTERVAL '1 day',
        'Software licenses renewal - Annual subscription'
      ) RETURNING id
    `, [user.id, user.name, userTitle, vendorId, projectId]);
        // Add line items for PO 4
        await client.query(`
      INSERT INTO purchase_order_items (
        purchase_order_id,
        quantity,
        description,
        unit_price,
        total,
        line_order
      ) VALUES
      ($1, 10, 'Microsoft Office 365 Business - Annual License', 100.00, 1000.00, 1),
      ($1, 5, 'Adobe Creative Cloud - Annual License', 40.00, 200.00, 2)
    `, [po4.rows[0].id]);
        console.log('✅ Created PO-2026-0004 (PAID) with 2 line items');
        await client.query('COMMIT');
        // Display summary
        const summary = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM purchase_orders
      GROUP BY status
      ORDER BY status
    `);
        console.log('\n📊 PURCHASE ORDERS SUMMARY:');
        console.log('='.repeat(80));
        console.table(summary.rows);
        console.log('\n✅ Sample purchase orders seeded successfully!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding sample purchase orders:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run if executed directly
if (require.main === module) {
    seedSamplePurchaseOrders()
        .then(() => {
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    });
}
exports.default = seedSamplePurchaseOrders;
