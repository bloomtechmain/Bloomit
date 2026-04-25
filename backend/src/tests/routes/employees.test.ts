import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable } from '../helpers'

const VALID_EMPLOYEE = {
  employee_number: 'EMP-001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@test.com',
  phone: '555-0100',
  role: 'developer'
}

describe('Employees', () => {
  let token: string
  let employeeId: number

  beforeAll(async () => { token = await loginAs() })
  afterEach(async () => { await cleanTable('employees') })

  test('GET /employees — 401 without token', async () => {
    await request(app).get('/employees').expect(401)
  })

  test('POST /employees — creates employee', async () => {
    const res = await request(app)
      .post('/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_EMPLOYEE)
      .expect(201)
    expect(res.body.employee).toHaveProperty('employee_id')
    expect(res.body.employee.first_name).toBe('John')
    employeeId = res.body.employee.employee_id
  })

  test('POST /employees — 400 missing required fields', async () => {
    await request(app)
      .post('/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Jane' })
      .expect(400)
  })

  test('GET /employees — returns list', async () => {
    await request(app).post('/employees').set('Authorization', `Bearer ${token}`).send(VALID_EMPLOYEE)
    const res = await request(app).get('/employees').set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body.employees ?? res.body)).toBe(true)
  })

  test('GET /employees/:id — returns employee', async () => {
    const created = await request(app).post('/employees').set('Authorization', `Bearer ${token}`).send(VALID_EMPLOYEE)
    const id = created.body.employee.employee_id
    const res = await request(app).get(`/employees/${id}`).set('Authorization', `Bearer ${token}`).expect(200)
    expect(res.body.employee?.employee_id ?? res.body.employee_id).toBe(id)
  })

  test('GET /employees/:id — 404 for nonexistent', async () => {
    await request(app).get('/employees/999999').set('Authorization', `Bearer ${token}`).expect(404)
  })

  test('PUT /employees/:id — updates employee', async () => {
    const created = await request(app).post('/employees').set('Authorization', `Bearer ${token}`).send(VALID_EMPLOYEE)
    const id = created.body.employee.employee_id
    const res = await request(app)
      .put(`/employees/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_EMPLOYEE, first_name: 'Jane' })
      .expect(200)
    expect(res.body.employee?.first_name ?? res.body.first_name).toBe('Jane')
  })

  test('DELETE /employees/:id — deletes employee', async () => {
    const created = await request(app).post('/employees').set('Authorization', `Bearer ${token}`).send(VALID_EMPLOYEE)
    const id = created.body.employee.employee_id
    await request(app).delete(`/employees/${id}`).set('Authorization', `Bearer ${token}`).expect(200)
  })
})
