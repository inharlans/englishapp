import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const prismaCommand = ['prisma', 'generate']

function runCommand(command, args) {
  return spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })
}

function commandOutput(result) {
  return [result.stdout, result.stderr]
    .filter(Boolean)
    .map((chunk) => String(chunk))
    .join('\n')
}

function isPrismaRenameLockError(text) {
  return /EPERM: operation not permitted/.test(text) && /query_engine-.*\.dll\.node/.test(text)
}

function hasGeneratedPrismaClient() {
  const clientPath = join(process.cwd(), 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node')
  return existsSync(clientPath)
}

const prismaResult = runCommand('npx', prismaCommand)
if (prismaResult.status !== 0) {
  const output = commandOutput(prismaResult)
  const canContinue = isPrismaRenameLockError(output) && hasGeneratedPrismaClient()
  if (!canContinue) {
    process.stdout.write(prismaResult.stdout ?? '')
    process.stderr.write(prismaResult.stderr ?? '')
    process.exit(prismaResult.status ?? 1)
  }

  process.stderr.write(output)
  console.warn('prisma generate hit a file-lock issue; using existing generated client and continuing build.')
}

if (prismaResult.status === 0 && prismaResult.stdout) {
  process.stdout.write(prismaResult.stdout)
}
if (prismaResult.status === 0 && prismaResult.stderr) {
  process.stderr.write(prismaResult.stderr)
}

const nextResult = runCommand('npx', ['next', 'build'])
if (nextResult.stdout) {
  process.stdout.write(nextResult.stdout)
}
if (nextResult.stderr) {
  process.stderr.write(nextResult.stderr)
}
process.exit(nextResult.status ?? 0)
