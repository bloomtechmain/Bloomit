import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable } from '../helpers'

const VALID_SUB = {
  description: 'Adobe CC',
  amount: 54.99,
  due_date: '2026-06-01',
  frequency: 'MONTHLY',
  auto_pay: false,
  is_active: true
}

describe('Subscriptions', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })
  afterEach(async () => { await cleanTable('subscriptions') })

  test('GET /subscriptions — 401 without token', async () => {
    await request(app).get('/subscriptions').expect(401)
  })

  test('POST /subscriptions — creates subscription', async () => {
    const res = await request(app)
      .post('/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_SUB)
      .expect(201)
    expect(res.body.subscription ?? res.body).toHaveProperty('id')
  })

  test('POST /subscriptions — 400 missing required fields', async () => {
    await request(app)
      .post('/subscriptions')
      .set('Authorization', `Bearer ${token}`)
      .send({ frequency: 'MONTHLY' })
      .expect(400)
  })

  test('GET /subscriptions — returns list', async () => {
    await request(app).post('/subscriptions').set('Authorization', `Bearer ${token}`).send(VALID_SUB)
    const res = await request(app).get('/subscriptions').set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body.subscriptions ?? res.body)).toBe(true)
  })

  test('PUT /subscriptions/:id — updates subscription', async () => {
    const created = await request(app).post('/subscriptions').set('Authorization', `Bearer ${token}`).send(VALID_SUB)
    const id = (created.body.subscription ?? created.body).id
    await request(app)
      .put(`/subscriptions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_SUB, amount: 59.99 })
      .expect(200)
  })

  test('DELETE /subscriptions/:id — deletes subscription', async () => {
    const created = await request(app).post('/subscriptions').set('Authorization', `Bearer ${token}`).send(VALID_SUB)
    const id = (created.body.subscription ?? created.body).id
    await request(app).delete(`/subscriptions/${id}`).set('Authorization', `Bearer ${token}`).expect(200)
  })
})
