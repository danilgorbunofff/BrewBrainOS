const PROFILE_PREFIX = '--profile='

const profiles = {
  build: [
    ['NEXT_PUBLIC_SUPABASE_URL', 'required for Next.js production builds'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'required for Supabase browser and server clients'],
  ],
  server: [
    ['NEXT_PUBLIC_SUPABASE_URL', 'required for service-role Supabase access'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'required for cron, IoT, and webhook service access'],
    ['STRIPE_SECRET_KEY', 'required for billing routes'],
    ['CRON_SECRET', 'required for protected cron endpoints'],
  ],
  smoke: [
    ['NEXT_PUBLIC_SUPABASE_URL', 'required for smoke builds'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'required for smoke builds'],
    ['E2E_TEST_USER_EMAIL', 'required for Playwright login'],
    ['E2E_TEST_USER_PASSWORD', 'required for Playwright login'],
  ],
  migrations: [
    ['SUPABASE_DB_URL', 'required for ordered migration validation'],
  ],
}

const profileArg = process.argv.find((argument) => argument.startsWith(PROFILE_PREFIX))
const profileName = profileArg ? profileArg.slice(PROFILE_PREFIX.length) : 'build'
const requirements = profiles[profileName]

if (!requirements) {
  console.error(`Unknown env verification profile: ${profileName}`)
  console.error(`Available profiles: ${Object.keys(profiles).join(', ')}`)
  process.exit(1)
}

const missing = requirements.filter(([name]) => !process.env[name]?.trim())

if (missing.length > 0) {
  console.error(`Missing required environment variables for profile: ${profileName}`)

  for (const [name, reason] of missing) {
    console.error(`- ${name}: ${reason}`)
  }

  console.error('See .env.example for placeholders, public vs server-only grouping, and CI secret guidance.')
  process.exit(1)
}

console.log(`Environment check passed for profile: ${profileName}`)