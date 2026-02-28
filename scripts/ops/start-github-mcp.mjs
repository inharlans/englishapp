import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { loadEnvFile } from './load-env.mjs'

const rootDir = process.cwd()
const envPath = path.resolve(rootDir, '.env')

loadEnvFile(envPath)

const accessToken =
  typeof process.env.GITHUB_TOKEN === 'string' && process.env.GITHUB_TOKEN.trim()
    ? process.env.GITHUB_TOKEN
    : typeof process.env.GH_TOKEN === 'string' && process.env.GH_TOKEN.trim()
      ? process.env.GH_TOKEN
      : typeof process.env.GITHUB_PAT === 'string' && process.env.GITHUB_PAT.trim()
        ? process.env.GITHUB_PAT
        : ''

if (!accessToken) {
  console.error('[github-mcp] GitHub token is not set.')
  console.error('[github-mcp] Set one of GITHUB_TOKEN / GH_TOKEN / GITHUB_PAT in environment or .env file before starting OpenCode MCP.')
  process.exit(1)
}

if (/\s/.test(accessToken)) {
  console.error('[github-mcp] GitHub token contains spaces after trimming; this looks invalid.')
  process.exit(1)
}

const command = process.platform === 'win32' ? 'cmd' : 'npx'
const args = process.platform === 'win32'
  ? ['/c', 'npx', '-y', '@modelcontextprotocol/server-github@latest']
  : ['-y', '@modelcontextprotocol/server-github@latest']

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
