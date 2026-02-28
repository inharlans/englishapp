import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { loadEnvFile } from './load-env.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const envPath = path.resolve(rootDir, '.env')

loadEnvFile(envPath)

const accessToken = typeof process.env.SENTRY_ACCESS_TOKEN === 'string' ? process.env.SENTRY_ACCESS_TOKEN.trim() : ''

if (!accessToken) {
  console.error('[sentry-mcp] SENTRY_ACCESS_TOKEN is not set.')
  console.error('[sentry-mcp] Set a non-empty SENTRY_ACCESS_TOKEN in environment or .env file before starting OpenCode MCP.')
  process.exit(1)
}

if (accessToken.includes(' ')) {
  console.error('[sentry-mcp] SENTRY_ACCESS_TOKEN contains spaces after trimming; this looks invalid.')
  process.exit(1)
}

const command = process.platform === 'win32' ? 'cmd' : 'npx'
const args = process.platform === 'win32'
  ? ['/c', 'npx', '-y', '@sentry/mcp-server@latest', '--access-token', accessToken]
  : ['-y', '@sentry/mcp-server@latest', '--access-token', accessToken]

const result = spawnSync(command, args, {
  stdio: 'inherit'
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status)
}
