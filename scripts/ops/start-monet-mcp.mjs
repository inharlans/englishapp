import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { loadEnvFile } from './load-env.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')
const envPath = path.resolve(rootDir, '.env')

try {
  loadEnvFile(envPath)
} catch (error) {
  console.warn('[monet-mcp] .env 파일을 불러오지 못했습니다. 환경 변수 값으로 계속 진행합니다.')
  console.warn(`[monet-mcp] ${error?.message || error}`)
}

const token = typeof process.env.MONET_MCP_TOKEN === 'string' ? process.env.MONET_MCP_TOKEN.trim() : ''

if (!token) {
  console.error('[monet-mcp] MONET_MCP_TOKEN is not set.')
  console.error('[monet-mcp] Set MONET_MCP_TOKEN in environment or .env before starting monet-mcp.')
  process.exit(1)
}

if (/\s/.test(token)) {
  console.error('[monet-mcp] MONET_MCP_TOKEN contains whitespace after trimming; this looks invalid.')
  process.exit(1)
}

const endpoint = 'https://www.monet.design/api/remote/mcp'
const mcpRemoteVersion = '0.1.9'
const authHeader = `Authorization: Bearer ${token}`

const command = process.platform === 'win32' ? 'cmd' : 'npx'
const args = process.platform === 'win32'
  ? ['/c', 'npx', '-y', `mcp-remote@${mcpRemoteVersion}`, endpoint]
  : ['-y', `mcp-remote@${mcpRemoteVersion}`, endpoint]

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    MONET_MCP_TOKEN: token,
    MCP_REMOTE_HEADER: authHeader,
    MCP_REMOTE_HEADERS: JSON.stringify({ Authorization: `Bearer ${token}` })
  }
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

if (result.signal) {
  console.error(`[monet-mcp] mcp-remote terminated by signal: ${result.signal}`)
  process.exit(1)
}

if (typeof result.status !== 'number') {
  console.error('[monet-mcp] mcp-remote exited without a numeric status code.')
  process.exit(1)
}

if (result.status !== 0) {
  process.exit(result.status)
}
