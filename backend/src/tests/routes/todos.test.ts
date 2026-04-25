import request from 'supertest'
import app from '../../index'
import { loginAsDetails, cleanTable } from '../helpers'

describe('Todos', () => {
  let token: string
  let userId: number

  beforeAll(async () => {
    const details = await loginAsDetails()
    token = details.token
    userId = details.userId
  })
  afterEach(async () => { await cleanTable('todos') })

  test('GET /todos — 401 without token', async () => {
    await request(app).get('/todos').expect(401)
  })

  test('POST /todos — creates todo', async () => {
    const res = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, title: 'Buy milk', description: 'From the shop' })
      .expect(201)
    expect(res.body).toHaveProperty('id')
  })

  test('POST /todos — 400 missing user_id and title', async () => {
    await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'no title or user_id' })
      .expect(400)
  })

  test('GET /todos — returns list', async () => {
    await request(app).post('/todos').set('Authorization', `Bearer ${token}`).send({ user_id: userId, title: 'Task' })
    const res = await request(app).get(`/todos?user_id=${userId}`).set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('PUT /todos/:id — updates todo', async () => {
    const created = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, title: 'Old' })
    const id = created.body.id
    await request(app)
      .put(`/todos/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, title: 'Updated', status: 'completed' })
      .expect(200)
  })

  test('DELETE /todos/:id — deletes todo', async () => {
    const created = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: userId, title: 'Del' })
    const id = created.body.id
    await request(app)
      .delete(`/todos/${id}?user_id=${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  })
})
