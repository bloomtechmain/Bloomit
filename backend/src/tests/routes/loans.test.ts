import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable } from '../helpers'

const VALID_LOAN = {
  loan_account_number: 'LOAN-TEST-001',
  borrower_name: 'Jane Smith',
  bank_name: 'Test Bank',
  loan_amount: 10000,
  total_installments: 12,
  monthly_installment_amount: 900,
  interest_rate: 5.5,
  loan_type: 'PERSONAL',
  start_date: '2026-01-01',
  notes: 'Test loan'
}

describe('Loans', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })
  afterEach(async () => {
    await cleanTable('loan_installments')
    await cleanTable('loans')
  })

  test('GET /loans — 401 without token', async () => {
    await request(app).get('/loans').expect(401)
  })

  test('POST /loans — creates loan', async () => {
    const res = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_LOAN)
      .expect(201)
    expect(res.body.loan ?? res.body).toHaveProperty('id')
  })

  test('POST /loans — 400 missing required fields', async () => {
    await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ borrower_name: 'No required fields' })
      .expect(400)
  })

  test('GET /loans — returns list', async () => {
    await request(app).post('/loans').set('Authorization', `Bearer ${token}`).send(VALID_LOAN)
    const res = await request(app).get('/loans').set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body.loans ?? res.body)).toBe(true)
  })

  test('GET /loans/:id — returns loan', async () => {
    const created = await request(app).post('/loans').set('Authorization', `Bearer ${token}`).send(VALID_LOAN)
    const id = (created.body.loan ?? created.body).id
    const res = await request(app).get(`/loans/${id}`).set('Authorization', `Bearer ${token}`).expect(200)
    expect((res.body.loan ?? res.body).id).toBe(id)
  })

  test('GET /loans/:id — 404 for nonexistent', async () => {
    await request(app).get('/loans/999999').set('Authorization', `Bearer ${token}`).expect(404)
  })

  test('DELETE /loans/:id — deletes loan', async () => {
    const created = await request(app).post('/loans').set('Authorization', `Bearer ${token}`).send(VALID_LOAN)
    const id = (created.body.loan ?? created.body).id
    await request(app).delete(`/loans/${id}`).set('Authorization', `Bearer ${token}`).expect(200)
  })
})
