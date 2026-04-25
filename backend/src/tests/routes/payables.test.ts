import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable, pool, TENANT_SCHEMA } from '../helpers'

describe('Payables', () => {
  let token: string
  let vendorId: number

  beforeAll(async () => {
    token = await loginAs()
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      const v = await client.query(
        `INSERT INTO vendors (vendor_name, contact_email) VALUES ('Payable Vendor', 'payvendor@test.com') RETURNING vendor_id`
      )
      vendorId = v.rows[0].vendor_id
    } finally {
      client.release()
    }
  })

  afterEach(async () => {
    await cleanTable('payment_payables')
    await cleanTable('payables')
  })

  afterAll(async () => {
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      await client.query(`DELETE FROM vendors WHERE vendor_name = 'Payable Vendor'`)
    } finally {
      client.release()
    }
  })

  const validPayable = () => ({
    vendor_id: vendorId,
    payable_name: 'Office Supplies',
    payable_type: 'VENDOR_PAYMENT',
    description: 'Monthly supplies',
    amount: 250.00,
    frequency: 'ONE_TIME',
    start_date: '2026-05-01',
    is_active: true
  })

  test('GET /payables — 401 without token', async () => {
    await request(app).get('/payables').expect(401)
  })

  test('POST /payables — creates payable', async () => {
    const res = await request(app)
      .post('/payables')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayable())
      .expect(201)
    expect(res.body.payable ?? res.body).toHaveProperty('payable_id')
  })

  test('POST /payables — 400 missing required fields', async () => {
    await request(app)
      .post('/payables')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'no amount or name' })
      .expect(400)
  })

  test('GET /payables — returns list', async () => {
    await request(app).post('/payables').set('Authorization', `Bearer ${token}`).send(validPayable())
    const res = await request(app).get('/payables').set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body.payables ?? res.body)).toBe(true)
  })

  test('PUT /payables/:id — updates payable', async () => {
    const created = await request(app).post('/payables').set('Authorization', `Bearer ${token}`).send(validPayable())
    const id = (created.body.payable ?? created.body).payable_id
    await request(app)
      .put(`/payables/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayable(), amount: 300 })
      .expect(200)
  })

  test('DELETE /payables/:id — deletes payable', async () => {
    const created = await request(app).post('/payables').set('Authorization', `Bearer ${token}`).send(validPayable())
    const id = (created.body.payable ?? created.body).payable_id
    await request(app).delete(`/payables/${id}`).set('Authorization', `Bearer ${token}`).expect(200)
  })
})
