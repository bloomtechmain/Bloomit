/**
 * Purchase Orders API Tests
 * Tests all controller methods, authorization rules, and validation logic
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../index';
import pool from '../db';

describe('Purchase Orders API', () => {
  let adminToken: string;
  let employeeToken: string;
  let testVendorId: number;
  let testProjectId: number;
  let testPOId: number;

  beforeAll(async () => {
    // Setup: Login as admin and employee to get tokens
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@bloomaudit.com', password: 'admin123' });
    adminToken = adminLogin.body.token;

    const employeeLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'employee@bloomaudit.com', password: 'employee123' });
    employeeToken = employeeLogin.body.token;

    // Create test vendor
    const vendor = await pool.query(
      'INSERT INTO vendors (name, contact_person, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Test Vendor', 'John Doe', 'vendor@test.com', '1234567890']
    );
    testVendorId = vendor.rows[0].id;

    // Create test project
    const project = await pool.query(
      'INSERT INTO projects (name, status) VALUES ($1, $2) RETURNING id',
      ['Test Project', 'active']
    );
    testProjectId = project.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await pool.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [testPOId]);
    await pool.query('DELETE FROM purchase_orders WHERE id = $1', [testPOId]);
    await pool.query('DELETE FROM vendors WHERE id = $1', [testVendorId]);
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    await pool.end();
  });

  describe('POST /purchase-orders - Create Purchase Order', () => {
    test('10.1.1: Should create a new purchase order with valid data', async () => {
      const poData = {
        vendor_id: testVendorId,
        project_id: testProjectId,
        payment_method: 'Check',
        tax_amount: 100,
        shipping_cost: 50,
        notes: 'Test PO',
        items: [
          { description: 'Item 1', quantity: 2, unit_price: 100 },
          { description: 'Item 2', quantity: 1, unit_price: 50 }
        ]
      };

      const response = await request(app)
        .post('/purchase-orders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(poData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('po_number');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.vendor_id).toBe(testVendorId);
      expect(response.body.total).toBe(400); // (2*100 + 1*50) + 100 + 50

      testPOId = response.body.id;
    });

    test('10.1.2: Should fail without authentication', async () => {
      const poData = {
        vendor_id: testVendorId,
        project_id: testProjectId,
        items: []
      };

      await request(app)
        .post('/purchase-orders')
        .send(poData)
        .expect(401);
    });

    test('10.1.3: Should fail without required fields', async () => {
      const poData = {
        vendor_id: testVendorId,
        // Missing project_id and items
      };

      const response = await request(app)
        .post('/purchase-orders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(poData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('10.1.4: Should fail with empty line items array', async () => {
      const poData = {
        vendor_id: testVendorId,
        project_id: testProjectId,
        items: []
      };

      const response = await request(app)
        .post('/purchase-orders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(poData)
        .expect(400);

      expect(response.body.error).toContain('line items');
    });

    test('10.1.5: Should fail with invalid line item data', async () => {
      const poData = {
        vendor_id: testVendorId,
        project_id: testProjectId,
        items: [
          { description: 'Item 1', quantity: -1, unit_price: 100 } // Negative quantity
        ]
      };

      const response = await request(app)
        .post('/purchase-orders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(poData)
        .expect(400);

      expect(response.body.error).toContain('quantity');
    });
  });

  describe('GET /purchase-orders - Get All Purchase Orders', () => {
    test('10.1.6: Should retrieve all purchase orders', async () => {
      const response = await request(app)
        .get('/purchase-orders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('10.1.7: Should filter by status', async () => {
      const response = await request(app)
        .get('/purchase-orders?status=PENDING')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((po: any) => {
        expect(po.status).toBe('PENDING');
      });
    });

    test('10.1.8: Should filter by vendor', async () => {
      const response = await request(app)
        .get(`/purchase-orders?vendor_id=${testVendorId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((po: any) => {
        expect(po.vendor_id).toBe(testVendorId);
      });
    });

    test('10.1.9: Should filter by project', async () => {
      const response = await request(app)
        .get(`/purchase-orders?project_id=${testProjectId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((po: any) => {
        expect(po.project_id).toBe(testProjectId);
      });
    });
  });

  describe('GET /purchase-orders/:id - Get Single Purchase Order', () => {
    test('10.1.10: Should retrieve a purchase order by ID with items', async () => {
      const response = await request(app)
        .get(`/purchase-orders/${testPOId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testPOId);
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(2);
    });

    test('10.1.11: Should return 404 for non-existent PO', async () => {
      await request(app)
        .get('/purchase-orders/999999')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(404);
    });
  });

  describe('PUT /purchase-orders/:id - Update Purchase Order', () => {
    test('10.1.12: Should update a pending purchase order', async () => {
      const updateData = {
        notes: 'Updated notes',
        tax_amount: 150
      };

      const response = await request(app)
        .put(`/purchase-orders/${testPOId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.notes).toBe('Updated notes');
      expect(response.body.tax_amount).toBe(150);
    });

    test('10.1.13: Should fail to update approved PO without admin permission', async () => {
      // First approve the PO as admin
      await request(app)
        .post(`/purchase-orders/${testPOId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Try to update as employee
      const response = await request(app)
        .put(`/purchase-orders/${testPOId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ notes: 'Try to update' })
        .expect(403);

      expect(response.body.error).toContain('PENDING');
    });
  });

  describe('POST /purchase-orders/:id/approve - Approve Purchase Order', () => {
    beforeEach(async () => {
      // Reset PO to PENDING status
      await pool.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['PENDING', testPOId]);
    });

    test('10.1.14: Admin should be able to approve a purchase order', async () => {
      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.approved_by).toBeDefined();
      expect(response.body.approved_at).toBeDefined();
    });

    test('10.1.15: Non-admin should not be able to approve', async () => {
      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.error).toContain('permission');
    });

    test('10.1.16: Should fail to approve already approved PO', async () => {
      // Approve once
      await request(app)
        .post(`/purchase-orders/${testPOId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Try to approve again
      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toContain('already');
    });
  });

  describe('POST /purchase-orders/:id/reject - Reject Purchase Order', () => {
    beforeEach(async () => {
      // Reset PO to PENDING status
      await pool.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['PENDING', testPOId]);
    });

    test('10.1.17: Admin should be able to reject with reason', async () => {
      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejection_reason: 'Budget exceeded' })
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
      expect(response.body.rejection_reason).toBe('Budget exceeded');
    });

    test('10.1.18: Should fail to reject without reason', async () => {
      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('reason');
    });

    test('10.1.19: Non-admin should not be able to reject', async () => {
      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/reject`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ rejection_reason: 'Budget exceeded' })
        .expect(403);

      expect(response.body.error).toContain('permission');
    });
  });

  describe('POST /purchase-orders/:id/upload-receipt - Upload Receipt', () => {
    beforeEach(async () => {
      // Set PO to APPROVED status
      await pool.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['APPROVED', testPOId]);
    });

    test('10.1.20: Should upload receipt and mark as PAID', async () => {
      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/upload-receipt`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('receipt', Buffer.from('fake pdf content'), 'receipt.pdf')
        .expect(200);

      expect(response.body.status).toBe('PAID');
      expect(response.body.receipt_document_id).toBeDefined();
    });

    test('10.1.21: Should accept receipt URL as alternative', async () => {
      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/upload-receipt`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ receipt_url: 'https://example.com/receipt.pdf' })
        .expect(200);

      expect(response.body.status).toBe('PAID');
      expect(response.body.receipt_url).toBe('https://example.com/receipt.pdf');
    });

    test('10.1.22: Should fail to upload receipt for non-approved PO', async () => {
      // Set to PENDING
      await pool.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['PENDING', testPOId]);

      const response = await request(app)
        .post(`/purchase-orders/${testPOId}/upload-receipt`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ receipt_url: 'https://example.com/receipt.pdf' })
        .expect(400);

      expect(response.body.error).toContain('APPROVED');
    });
  });

  describe('Authorization Tests', () => {
    test('10.1.23: Should enforce view permission', async () => {
      // Test with user without view permission (if such role exists)
      await request(app)
        .get('/purchase-orders')
        .expect(401); // No token
    });

    test('10.1.24: Should enforce create permission', async () => {
      const poData = {
        vendor_id: testVendorId,
        project_id: testProjectId,
        items: [{ description: 'Item', quantity: 1, unit_price: 100 }]
      };

      await request(app)
        .post('/purchase-orders')
        .send(poData)
        .expect(401); // No token
    });

    test('10.1.25: Should enforce approve permission', async () => {
      await request(app)
        .post(`/purchase-orders/${testPOId}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    test('10.1.26: Should enforce reject permission', async () => {
      await request(app)
        .post(`/purchase-orders/${testPOId}/reject`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ rejection_reason: 'Test' })
        .expect(403);
    });
  });

  describe('Validation Logic Tests', () => {
    test('10.1.27: Should validate PO number format', async () => {
      const response = await request(app)
        .get(`/purchase-orders/${testPOId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.po_number).toMatch(/^PO-\d{6}$/);
    });

    test('10.1.28: Should calculate total correctly', async () => {
      const response = await request(app)
        .get(`/purchase-orders/${testPOId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      const subtotal = response.body.items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unit_price), 0
      );
      const expectedTotal = subtotal + response.body.tax_amount + response.body.shipping_cost;

      expect(response.body.total).toBe(expectedTotal);
    });

    test('10.1.29: Should validate date fields', async () => {
      const response = await request(app)
        .get(`/purchase-orders/${testPOId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(new Date(response.body.created_at).toString()).not.toBe('Invalid Date');
      expect(new Date(response.body.updated_at).toString()).not.toBe('Invalid Date');
    });
  });
});
