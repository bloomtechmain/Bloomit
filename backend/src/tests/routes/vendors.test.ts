import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable } from '../helpers'

describe('Vendors', () => {
  let token: string
  let vendorId: number

  beforeAll(async () => { token = await loginAs() })
  afterEach(async () => { await cleanTable('vendors') })

  test('GET /vendors — 401 without token', async () => {
    await request(app).get('/vendors').expect(401)
  })

  test('POST /vendors — creates vendor', async () => {
    const res = await request(app)
      .post('/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({ vendor_name: 'Acme Corp', contact_email: 'acme@test.com', contact_phone: '555-0001' })
      .expect(201)
    expect(res.body.vendor).toHaveProperty('vendor_id')
    expect(res.body.vendor.vendor_name).toBe('Acme Corp')
    vendorId = res.body.vendor.vendor_id
  })

  test('POST /vendors — 400 without vendor_name', async () => {
    await request(app)
      .post('/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({ contact_email: 'test@test.com' })
      .expect(400)
  })

  test('GET /vendors — returns list', async () => {
    await request(app)
      .post('/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({ vendor_name: 'Test Vendor' })
    const res = await request(app)
      .get('/vendors')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.vendors)).toBe(true)
    expect(res.body.vendors.length).toBeGreaterThan(0)
  })
})
