import request from 'supertest'
import app from '../../index'
import { loginAs } from '../helpers'

describe('Settings', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })

  test('GET /api/settings — 401 without token', async () => {
    await request(app).get('/api/settings').expect(401)
  })

  test('GET /api/settings — returns settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body).toBeDefined()
  })
})
