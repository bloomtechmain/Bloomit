import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable } from '../helpers'

const VALID_RECEIVABLE = {
  payer_name: 'Client Corp',
  receivable_name: 'Invoice #001',
  description: 'Monthly retainer',
  receivable_type: 'invoice',
  amount: 5000.00,
  frequency: 'ONE_TIME',
  start_date: '2026-05-01',
  is_active: true
}

describe('Receivables', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })
  afterEach(async () => { await cleanTable('receivables') })

  test('GET /receivables — 401 without token', async () => {
    await request(app).get('/receivables').expect(401)
  })

  test('POST /receivables — creates receivable', async () => {
    const res = await request(app)
      .post('/receivables')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_RECEIVABLE)
      .expect(201)
    expect(res.body.receivable ?? res.body).toHaveProperty('receivable_id')
  })

  test('GET /receivables — returns list', async () => {
    await request(app).post('/receivables').set('Authorization', `Bearer ${token}`).send(VALID_RECEIVABLE)
    const res = await request(app).get('/receivables').set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body.receivables ?? res.body)).toBe(true)
  })
})
