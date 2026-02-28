import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync, spawnSync } from 'node:child_process'
import { loadEnvFile } from './load-env.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')
const envPath = path.resolve(rootDir, '.env')

try {
  loadEnvFile(envPath)
} catch (error) {
  console.warn('[github-mcp] .env 파일을 불러오지 못했습니다. 환경 변수는 현재 실행 환경 값으로 계속 진행합니다.')
  console.warn(`[github-mcp] ${error?.message || error}`)
}

const normalizeGitHubToken = (tokenValue) => {
  if (typeof tokenValue !== 'string') return ''
  return tokenValue.trim().replace(/^"|"$|^'|'$/g, '')
}

const accessToken =
  normalizeGitHubToken(process.env.GITHUB_TOKEN) ||
  normalizeGitHubToken(process.env.GH_TOKEN) ||
  normalizeGitHubToken(process.env.GITHUB_PAT) ||
  normalizeGitHubToken(process.env.GITHUB_AUTH_TOKEN) ||
  normalizeGitHubToken(process.env.GITHUB_PERSONAL_ACCESS_TOKEN) ||
  (() => {
    try {
      const raw = execSync('gh auth token', { encoding: 'utf8' })
      return normalizeGitHubToken(raw)
    } catch {
      return ''
    }
  })()

if (!accessToken) {
  console.error('[github-mcp] GitHub token is not set.')
  console.error(
    '[github-mcp] Set one of GITHUB_TOKEN / GH_TOKEN / GITHUB_PAT / GITHUB_AUTH_TOKEN / GITHUB_PERSONAL_ACCESS_TOKEN in environment, .env file, or `gh auth login` before starting OpenCode MCP.'
  )
  process.exit(1)
}

if (/\s/.test(accessToken)) {
  console.error('[github-mcp] GitHub token contains spaces after trimming; this looks invalid.')
  process.exit(1)
}

process.env.GITHUB_TOKEN = accessToken
process.env.GITHUB_PERSONAL_ACCESS_TOKEN = accessToken

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
