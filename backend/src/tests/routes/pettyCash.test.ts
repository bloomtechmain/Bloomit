import request from 'supertest'
import app from '../../index'
import { loginAs } from '../helpers'

describe('Petty Cash', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })

  test('GET /petty-cash/balance — 401 without token', async () => {
    await request(app).get('/petty-cash/balance').expect(401)
  })

  test('GET /petty-cash/balance — returns balance', async () => {
    const res = await request(app)
      .get('/petty-cash/balance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body).toHaveProperty('current_balance')
  })

  test('GET /petty-cash/transactions — returns list', async () => {
    const res = await request(app)
      .get('/petty-cash/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.transactions ?? res.body)).toBe(true)
  })

  test('POST /petty-cash/bill — 400 missing required fields', async () => {
    await request(app)
      .post('/petty-cash/bill')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'no amount' })
      .expect(400)
  })
})
