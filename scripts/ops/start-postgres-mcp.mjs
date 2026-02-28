import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { loadEnvFile } from './load-env.mjs'

const rootDir = process.cwd()
const envPath = path.resolve(rootDir, '.env')
loadEnvFile(envPath)
const databaseUrl = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL.trim() : ''

if (!databaseUrl) {
  console.error('[postgres-mcp] DATABASE_URL is not set.')
  console.error('[postgres-mcp] Set a non-empty DATABASE_URL in environment or .env file before starting OpenCode MCP.')
  process.exit(1)
}

if (databaseUrl.includes(' ')) {
  console.error('[postgres-mcp] DATABASE_URL contains spaces after trimming; this looks invalid.')
  console.error('[postgres-mcp] Set DATABASE_URL without surrounding spaces.')
  process.exit(1)
}

process.env.DATABASE_URL = databaseUrl

const command = process.platform === 'win32' ? 'cmd' : 'npx'
const args = process.platform === 'win32'
  ? ['/c', 'npx', '-y', '@modelcontextprotocol/server-postgres@latest', databaseUrl]
  : ['-y', '@modelcontextprotocol/server-postgres@latest', databaseUrl]

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
