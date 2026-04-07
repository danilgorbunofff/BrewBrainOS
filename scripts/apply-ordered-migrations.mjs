import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const dbUrl = process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL.')
  process.exit(1)
}

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations', 'ordered')
const files = fs
  .readdirSync(migrationDir)
  .filter((file) => file.endsWith('.sql'))
  .sort((left, right) => left.localeCompare(right))

if (files.length === 0) {
  console.error(`No ordered migration files found in ${migrationDir}.`)
  process.exit(1)
}

const checkPsql = spawnSync('psql', ['--version'], { stdio: 'ignore' })
if (checkPsql.error || checkPsql.status !== 0) {
  console.error('psql is required to apply ordered migrations. Install PostgreSQL client tools first.')
  process.exit(1)
}

for (const file of files) {
  const absolutePath = path.join(migrationDir, file)
  console.log(`\n==> Applying ${file}`)

  const result = spawnSync(
    'psql',
    ['-v', 'ON_ERROR_STOP=1', dbUrl, '-f', absolutePath],
    {
      stdio: 'inherit',
    }
  )

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('\nOrdered migration track applied successfully.')
