import nextEnv from '@next/env'
import { pathToFileURL } from 'node:url'

const { loadEnvConfig } = nextEnv

const PROFILE_PREFIX = '--profile='

export const profiles = {
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

export function loadNextEnvFiles(projectDir = process.cwd()) {
  loadEnvConfig(projectDir, process.env.NODE_ENV !== 'production', console, true)
}

export function getRequirementsForProfile(profileName = 'build') {
  const requirements = profiles[profileName]

  if (!requirements) {
    throw new Error(
      `Unknown env verification profile: ${profileName}. Available profiles: ${Object.keys(profiles).join(', ')}`
    )
  }

  return requirements
}

export function verifyRequiredEnv(profileName = 'build', projectDir = process.cwd()) {
  loadNextEnvFiles(projectDir)

  const requirements = getRequirementsForProfile(profileName)
  const missing = requirements.filter(([name]) => !process.env[name]?.trim())

  return {
    ok: missing.length === 0,
    profileName,
    missing,
  }
}

function runCli() {
  const profileArg = process.argv.find((argument) => argument.startsWith(PROFILE_PREFIX))
  const profileName = profileArg ? profileArg.slice(PROFILE_PREFIX.length) : 'build'

  let result

  try {
    result = verifyRequiredEnv(profileName)
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Unknown env verification error')
    process.exit(1)
  }

  if (!result.ok) {
    console.error(`Missing required environment variables for profile: ${result.profileName}`)

    for (const [name, reason] of result.missing) {
      console.error(`- ${name}: ${reason}`)
    }

    console.error('The verifier loads shell env plus Next.js env files such as .env.local when present.')
    console.error('See .env.example for placeholders, public vs server-only grouping, and CI secret guidance.')
    process.exit(1)
  }

  console.log(`Environment check passed for profile: ${result.profileName}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli()
}