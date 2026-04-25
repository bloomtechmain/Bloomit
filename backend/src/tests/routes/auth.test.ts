import request from 'supertest'
import app from '../../index'
import { ADMIN_CREDS } from '../helpers'

describe('Auth', () => {
  let token: string

  test('POST /auth/login — success with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ ...ADMIN_CREDS, force: true })
      .expect(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body.user.email).toBe(ADMIN_CREDS.email)
    token = res.body.accessToken
  })

  test('POST /auth/login — 401 with wrong password', async () => {
    await request(app)
      .post('/auth/login')
      .send({ email: ADMIN_CREDS.email, password: 'wrongpass' })
      .expect(401)
  })

  test('POST /auth/login — 401 with unknown email', async () => {
    await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'anything' })
      .expect(401)
  })

  test('POST /auth/login — 400 with missing fields', async () => {
    await request(app)
      .post('/auth/login')
      .send({ email: ADMIN_CREDS.email })
      .expect(400)
  })

  test('GET /health — returns healthy', async () => {
    const res = await request(app).get('/health').expect(200)
    expect(res.body.status).toBe('healthy')
  })

  test('POST /auth/logout — success', async () => {
    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  })

  test('POST /auth/logout — 401 without token', async () => {
    await request(app).post('/auth/logout').expect(401)
  })
})
