import request from 'supertest'
import app from '../../index'
import { loginAsDetails, cleanTable } from '../helpers'

describe('Notes', () => {
  let token: string
  let userId: number

  beforeAll(async () => {
    const details = await loginAsDetails()
    token = details.token
    userId = details.userId
  })
  afterEach(async () => { await cleanTable('notes') })

  test('GET /notes — 401 without token', async () => {
    await request(app).get('/notes').expect(401)
  })

  test('POST /notes — creates note', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, title: 'Test Note', content: 'Some content' })
      .expect(201)
    expect(res.body).toHaveProperty('id')
  })

  test('POST /notes — 400 missing title', async () => {
    await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, content: 'no title' })
      .expect(400)
  })

  test('GET /notes — returns list', async () => {
    await request(app).post('/notes').set('Authorization', `Bearer ${token}`).send({ user_id: userId, title: 'T', content: 'C' })
    const res = await request(app).get(`/notes?user_id=${userId}`).set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('PUT /notes/:id — updates note', async () => {
    const created = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, title: 'Old', content: 'Old content' })
    const id = created.body.id
    const res = await request(app)
      .put(`/notes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, title: 'New', content: 'New content' })
      .expect(200)
    expect(res.body.title).toBe('New')
  })

  test('DELETE /notes/:id — deletes note', async () => {
    const created = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, title: 'Del', content: 'Del content' })
    const id = created.body.id
    await request(app)
      .delete(`/notes/${id}?user_id=${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  })
})
