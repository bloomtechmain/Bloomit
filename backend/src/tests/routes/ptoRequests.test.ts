import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable, pool, TENANT_SCHEMA } from '../helpers'

describe('PTO Requests', () => {
  let token: string
  let employeeId: number

  beforeAll(async () => {
    token = await loginAs()
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      const res = await client.query(
        `INSERT INTO employees (employee_number, first_name, last_name, email, phone, role)
         VALUES ('EMP-PTO', 'PTO', 'User', 'pto@test.com', '555-0200', 'staff') RETURNING id`
      )
      employeeId = res.rows[0].id
    } finally {
      client.release()
    }
  })

  afterEach(async () => { await cleanTable('pto_requests') })

  afterAll(async () => {
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      await client.query(`DELETE FROM employees WHERE employee_number = 'EMP-PTO'`)
    } finally {
      client.release()
    }
  })

  test('GET /pto-requests — 401 without token', async () => {
    await request(app).get('/pto-requests').expect(401)
  })

  test('GET /pto-requests — returns list with token', async () => {
    const res = await request(app)
      .get('/pto-requests')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.ptoRequests ?? res.body)).toBe(true)
  })

  test('POST /pto-requests — creates PTO request', async () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const res = await request(app)
      .post('/pto-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employee_id: employeeId,
        absence_type: 'Vacation',
        from_date: fmt(tomorrow),
        to_date: fmt(dayAfter),
        total_hours: 16
      })
      .expect(201)
    expect(res.body.ptoRequest ?? res.body).toHaveProperty('id')
  })

  test('POST /pto-requests — 400 missing required fields', async () => {
    await request(app)
      .post('/pto-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ absence_type: 'Vacation' })
      .expect(400)
  })

  test('GET /pto-requests/pending — returns pending list', async () => {
    const res = await request(app)
      .get('/pto-requests/pending')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.ptoRequests ?? res.body)).toBe(true)
  })
})
