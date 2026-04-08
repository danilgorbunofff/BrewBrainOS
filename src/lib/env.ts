type EnvVisibility = 'public' | 'server'

const ENV_HELP_SUFFIX = 'See .env.example for the expected names, placeholders, and secret storage guidance.'

export function getRequiredEnv(name: string, visibility: EnvVisibility = 'server') {
  const value = process.env[name]?.trim()

  if (!value) {
    const scope = visibility === 'public' ? 'public' : 'server-only'
    throw new Error(`Missing required ${scope} environment variable: ${name}. ${ENV_HELP_SUFFIX}`)
  }

  return value
}