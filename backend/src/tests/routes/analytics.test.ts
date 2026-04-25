import request from 'supertest'
import app from '../../index'
import { loginAs } from '../helpers'

describe('Analytics', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })

  test('GET /analytics/summary — 401 without token', async () => {
    await request(app).get('/analytics/summary').expect(401)
  })

  test('GET /analytics/summary — returns analytics data', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body).toBeDefined()
  })
})
