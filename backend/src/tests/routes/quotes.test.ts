import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable } from '../helpers'

const VALID_QUOTE = {
  template_type: 'standard',
  company_name: 'Acme Corp',
  date_of_issue: '2026-05-01',
  items: [{ description: 'Consulting', quantity: 10, unit_price: 150, total: 1500 }]
}

describe('Quotes', () => {
  let token: string

  beforeAll(async () => { token = await loginAs() })
  afterEach(async () => {
    await cleanTable('quote_items')
    await cleanTable('quote_additional_services')
    await cleanTable('quote_status_history')
    await cleanTable('quote_reminders')
    await cleanTable('quotes')
  })

  test('GET /quotes — 401 without token', async () => {
    await request(app).get('/quotes').expect(401)
  })

  test('GET /quotes — returns list', async () => {
    const res = await request(app).get('/quotes').set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body.quotes ?? res.body)).toBe(true)
  })

  test('POST /quotes — creates quote', async () => {
    const res = await request(app)
      .post('/quotes')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_QUOTE)
      .expect(201)
    expect(res.body.quote ?? res.body).toHaveProperty('quote_id')
  })

  test('POST /quotes — 400 missing required fields', async () => {
    await request(app)
      .post('/quotes')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'No items' })
      .expect(400)
  })

  test('GET /quotes/:id — returns quote', async () => {
    const created = await request(app).post('/quotes').set('Authorization', `Bearer ${token}`).send(VALID_QUOTE)
    const id = (created.body.quote ?? created.body).quote_id
    const res = await request(app).get(`/quotes/${id}`).set('Authorization', `Bearer ${token}`).expect(200)
    expect((res.body.quote ?? res.body).quote_id).toBe(id)
  })

  test('GET /quotes/:id — 404 for nonexistent', async () => {
    await request(app).get('/quotes/999999').set('Authorization', `Bearer ${token}`).expect(404)
  })

  test('DELETE /quotes/:id — deletes quote', async () => {
    const created = await request(app).post('/quotes').set('Authorization', `Bearer ${token}`).send(VALID_QUOTE)
    const id = (created.body.quote ?? created.body).quote_id
    await request(app).delete(`/quotes/${id}`).set('Authorization', `Bearer ${token}`).expect(200)
  })
})
