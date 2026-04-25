import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable, pool, TENANT_SCHEMA } from '../helpers'

describe('Payroll', () => {
  let token: string
  let employeeId: number

  beforeAll(async () => {
    token = await loginAs()
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      const e = await client.query(
        `INSERT INTO employees (employee_number, first_name, last_name, email, phone, role, base_salary)
         VALUES ('EMP-PAY', 'Pay', 'Roll', 'pay@test.com', '555-0300', 'staff', 3000) RETURNING id`
      )
      employeeId = e.rows[0].id
    } finally {
      client.release()
    }
  })

  afterEach(async () => { await cleanTable('payslips') })

  afterAll(async () => {
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      await client.query(`DELETE FROM employees WHERE employee_number = 'EMP-PAY'`)
    } finally {
      client.release()
    }
  })

  test('GET /payroll/employees — 401 without token', async () => {
    await request(app).get('/payroll/employees').expect(401)
  })

  test('GET /payroll/employees — returns employees with payroll data', async () => {
    const res = await request(app)
      .get('/payroll/employees')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.employees ?? res.body)).toBe(true)
  })

  test('GET /payroll/payslips — returns payslips list', async () => {
    const res = await request(app)
      .get('/payroll/payslips')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.payslips ?? res.body)).toBe(true)
  })

  test('POST /payroll/payslips — creates payslip', async () => {
    const res = await request(app)
      .post('/payroll/payslips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employee_id: employeeId,
        payslip_month: 4,
        payslip_year: 2026
      })
      .expect(201)
    expect(res.body.payslip ?? res.body).toHaveProperty('payslip_id')
  })

  test('POST /payroll/payslips — 400 missing required fields', async () => {
    await request(app)
      .post('/payroll/payslips')
      .set('Authorization', `Bearer ${token}`)
      .send({ employee_id: employeeId })
      .expect(400)
  })
})
