import fs from 'node:fs'

function stripInlineComment(value) {
  let inSingleQuote = false
  let inDoubleQuote = false
  let isEscaped = false

  for (let i = 0; i < value.length; i++) {
    const char = value[i]

    if (isEscaped) {
      isEscaped = false
      continue
    }

    if (inDoubleQuote && char === '\\') {
      isEscaped = true
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '#' && !inSingleQuote && !inDoubleQuote) {
      return value.slice(0, i).trim()
    }
  }

  return value.trim()
}

export function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const kvMatch = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!kvMatch) {
      continue
    }

    const key = kvMatch[1]
    let value = kvMatch[2]

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    } else {
      value = stripInlineComment(value)
    }

    value = value.trim()
    if (!value || typeof process.env[key] !== 'undefined') {
      continue
    }

    process.env[key] = value
  }
}
