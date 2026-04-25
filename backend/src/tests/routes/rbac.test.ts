import request from 'supertest'
import app from '../../index'
import { loginAs } from '../helpers'

describe('RBAC', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })

  test('GET /rbac/roles — 401 without token', async () => {
    await request(app).get('/rbac/roles').expect(401)
  })

  test('GET /rbac/roles — returns roles', async () => {
    const res = await request(app)
      .get('/rbac/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.roles ?? res.body)).toBe(true)
  })

  test('GET /rbac/permissions — returns permissions', async () => {
    const res = await request(app)
      .get('/rbac/permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.permissions ?? res.body)).toBe(true)
  })
})
