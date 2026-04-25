import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable, pool, TENANT_SCHEMA } from '../helpers'

describe('Purchase Orders', () => {
  let token: string
  let vendorId: number

  beforeAll(async () => {
    token = await loginAs()
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      const v = await client.query(
        `INSERT INTO vendors (vendor_name, contact_email) VALUES ('PO Vendor', 'povendor@test.com') RETURNING vendor_id`
      )
      vendorId = v.rows[0].vendor_id
    } finally {
      client.release()
    }
  })

  afterEach(async () => {
    await cleanTable('purchase_order_items')
    await cleanTable('purchase_orders')
  })

  afterAll(async () => {
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      await client.query(`DELETE FROM vendors WHERE vendor_name = 'PO Vendor'`)
    } finally {
      client.release()
    }
  })

  test('GET /purchase-orders — 401 without token', async () => {
    await request(app).get('/purchase-orders').expect(401)
  })

  test('GET /purchase-orders — returns list', async () => {
    const res = await request(app)
      .get('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.purchase_orders ?? res.body)).toBe(true)
  })

  test('POST /purchase-orders — creates PO', async () => {
    const poNumRes = await request(app).get('/purchase-orders/next-po-number').set('Authorization', `Bearer ${token}`)
    const po_number = poNumRes.body.po_number
    const res = await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        po_number,
        requested_by_name: 'Test Admin',
        vendor_id: vendorId,
        total_amount: 600,
        subtotal: 600,
        items: [{ description: 'Desk', quantity: 2, unit_price: 300, total: 600 }]
      })
      .expect(201)
    expect(res.body.purchase_order ?? res.body).toHaveProperty('id')
  })

  test('POST /purchase-orders — 400 missing required fields', async () => {
    await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ description: 'Item', quantity: 1, unit_price: 100 }] })
      .expect(400)
  })

  test('GET /purchase-orders/next-po-number — returns PO number', async () => {
    const res = await request(app)
      .get('/purchase-orders/next-po-number')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body).toHaveProperty('po_number')
  })

  test('GET /purchase-orders/:id — 404 for nonexistent', async () => {
    await request(app)
      .get('/purchase-orders/999999')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })
})
