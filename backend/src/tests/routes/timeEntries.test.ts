import request from 'supertest'
import app from '../../index'
import { loginAs, cleanTable, pool, TENANT_SCHEMA } from '../helpers'

describe('Time Entries', () => {
  let token: string
  let employeeId: number
  let projectId: number

  beforeAll(async () => {
    token = await loginAs()
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      const emp = await client.query(
        `INSERT INTO employees (first_name, last_name, email, role) VALUES ('Time', 'Tester', 'time@test.com', 'staff') RETURNING id`
      )
      employeeId = emp.rows[0].id
      const proj = await client.query(
        `INSERT INTO projects (project_name) VALUES ('Test Project') RETURNING project_id`
      )
      projectId = proj.rows[0].project_id
    } finally {
      client.release()
    }
  })

  afterEach(async () => { await cleanTable('time_entries') })

  afterAll(async () => {
    const client = await pool.connect()
    try {
      await client.query(`SET search_path TO "${TENANT_SCHEMA}", public`)
      await client.query(`DELETE FROM employees WHERE email = 'time@test.com'`)
      await client.query(`DELETE FROM projects WHERE project_name = 'Test Project'`)
    } finally {
      client.release()
    }
  })

  test('GET /time-entries/my-entries — 401 without token', async () => {
    await request(app).get('/time-entries/my-entries').expect(401)
  })

  test('GET /time-entries/my-entries — returns list', async () => {
    const res = await request(app)
      .get('/time-entries/my-entries')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.timeEntries ?? res.body)).toBe(true)
  })

  test('POST /time-entries — creates entry', async () => {
    const res = await request(app)
      .post('/time-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employee_id: employeeId,
        project_id: projectId,
        date: '2026-04-01',
        total_hours: 8,
        description: 'Development work'
      })
      .expect(201)
    expect(res.body.timeEntry ?? res.body).toHaveProperty('id')
  })

  test('POST /time-entries — 400 missing required fields', async () => {
    await request(app)
      .post('/time-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'no date or employee' })
      .expect(400)
  })

  test('GET /time-entries/pending — returns pending entries', async () => {
    const res = await request(app)
      .get('/time-entries/pending')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body.timeEntries ?? res.body)).toBe(true)
  })

  test('GET /time-entries/summary — returns summary', async () => {
    const res = await request(app)
      .get('/time-entries/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body).toBeDefined()
  })
})
