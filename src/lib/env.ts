type EnvVisibility = 'public' | 'server'

// Keep public env access static so Next.js can inline these values into client bundles.
const PUBLIC_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  NEXT_PUBLIC_ENABLE_PERF_MONITORING: process.env.NEXT_PUBLIC_ENABLE_PERF_MONITORING,
  NEXT_PUBLIC_PERF_CONSOLE_LOGGING: process.env.NEXT_PUBLIC_PERF_CONSOLE_LOGGING,
  NEXT_PUBLIC_PERFORMANCE_ENDPOINT: process.env.NEXT_PUBLIC_PERFORMANCE_ENDPOINT,
} as const

type PublicEnvName = keyof typeof PUBLIC_ENV

function isPublicEnvName(name: string): name is PublicEnvName {
  return name in PUBLIC_ENV
}

function getEnvHelpSuffix(visibility: EnvVisibility) {
  if (visibility === 'public') {
    return 'Copy .env.example to .env.local for local work, or configure the same NEXT_PUBLIC_* value in deployment or CI before building. Run npm run verify:env to validate the public build prerequisites.'
  }

  return 'Copy .env.example to .env.local for local work, or configure the matching server-only secret in deployment or CI before starting protected flows. Run npm run verify:env:server to validate critical server runtime secrets.'
}

function getEnvValue(name: string, visibility: EnvVisibility) {
  if (visibility === 'public') {
    if (!isPublicEnvName(name)) {
      throw new Error(
        `Unsupported public environment variable lookup: ${name}. Add it to src/lib/env.ts so Next.js can expose it safely to client bundles.`
      )
    }

    return PUBLIC_ENV[name]?.trim()
  }

  return process.env[name]?.trim()
}

export function getRequiredEnv(name: string, visibility: EnvVisibility = 'server') {
  const value = getEnvValue(name, visibility)

  if (!value) {
    const scope = visibility === 'public' ? 'public' : 'server-only'
    throw new Error(`Missing required ${scope} environment variable: ${name}. ${getEnvHelpSuffix(visibility)}`)
  }

  return value
}