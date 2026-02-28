import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { loadEnvFile } from './load-env.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const envPath = path.resolve(rootDir, '.env')

loadEnvFile(envPath)

const apiKey = typeof process.env.UPSTASH_CONTEXT7_API_KEY === 'string' ? process.env.UPSTASH_CONTEXT7_API_KEY.trim() : ''

if (!apiKey) {
  console.error('[context7-mcp] UPSTASH_CONTEXT7_API_KEY is not set.')
  console.error('[context7-mcp] Set a non-empty UPSTASH_CONTEXT7_API_KEY in environment or .env file before starting OpenCode MCP.')
  process.exit(1)
}

if (apiKey.includes(' ')) {
  console.error('[context7-mcp] UPSTASH_CONTEXT7_API_KEY contains spaces after trimming; this looks invalid.')
  process.exit(1)
}

const command = process.platform === 'win32' ? 'cmd' : 'npx'
const args = process.platform === 'win32'
  ? ['/c', 'npx', '-y', '@upstash/context7-mcp@latest', '--api-key', apiKey]
  : ['-y', '@upstash/context7-mcp@latest', '--api-key', apiKey]

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
