import { pool } from '../db'

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_items (
      project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
      requirements TEXT NOT NULL,
      service_category TEXT NOT NULL,
      unit_cost NUMERIC NOT NULL,
      requirement_type TEXT NOT NULL,
      PRIMARY KEY (project_id, requirements)
    );
  `)
  console.log('project_items table ensured')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
