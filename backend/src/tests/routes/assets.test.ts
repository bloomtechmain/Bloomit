import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable } from '../helpers'

const VALID_ASSET = {
  asset_name: 'Laptop',
  value: 1200,
  purchase_date: '2025-01-01',
  depreciation_method: 'straight-line',
  salvage_value: 200,
  useful_life: 5
}

describe('Assets', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })
  afterEach(async () => { await cleanTable('assets') })

  test('GET /assets — 401 without token', async () => {
    await request(app).get('/assets').expect(401)
  })

  test('POST /assets — creates asset', async () => {
    const res = await request(app)
      .post('/assets')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_ASSET)
      .expect(201)
    expect(res.body.asset ?? res.body).toHaveProperty('id')
  })

  test('POST /assets — 400 missing required fields', async () => {
    await request(app)
      .post('/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ asset_name: 'Desk' })
      .expect(400)
  })

  test('GET /assets — returns list', async () => {
    await request(app).post('/assets').set('Authorization', `Bearer ${token}`).send(VALID_ASSET)
    const res = await request(app).get('/assets').set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body.assets ?? res.body)).toBe(true)
  })
})
