import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const STAGED_FLAG = '--staged'
const cwd = process.cwd()

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd,
    stdio: 'pipe',
    maxBuffer: 50 * 1024 * 1024,
    ...options,
  })
}

function ensureGitleaksInstalled() {
  const result = run('gitleaks', ['version'])

  if (!result.error && result.status === 0) {
    return
  }

  console.error('gitleaks is required to scan for secrets.')
  console.error('Install it with `brew install gitleaks` and run the scan again.')
  process.exit(1)
}

function getStagedFiles() {
  const result = run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])

  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.exit(result.status ?? 1)
  }

  return result.stdout.toString('utf8').split('\0').filter(Boolean)
}

function writeStagedSnapshot(targetRoot, files) {
  for (const relativePath of files) {
    const blob = run('git', ['show', `:${relativePath}`])

    if (blob.status !== 0) {
      process.stderr.write(blob.stderr)
      process.exit(blob.status ?? 1)
    }

    const destination = path.join(targetRoot, relativePath)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.writeFileSync(destination, blob.stdout)
  }
}

function scanSource(sourcePath, staged) {
  const args = ['detect', '--redact', '--source', sourcePath]

  if (staged) {
    args.splice(1, 0, '--no-git')
  }

  const result = spawnSync('gitleaks', args, {
    cwd,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

function scanWorkingTree() {
  scanSource('.', false)
}

function scanStagedContent() {
  const stagedFiles = getStagedFiles()

  if (stagedFiles.length === 0) {
    console.log('No staged files to scan.')
    process.exit(0)
  }

  const snapshotRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'brewbrain-gitleaks-'))

  try {
    writeStagedSnapshot(snapshotRoot, stagedFiles)
    scanSource(snapshotRoot, true)
  } finally {
    fs.rmSync(snapshotRoot, { recursive: true, force: true })
  }
}

ensureGitleaksInstalled()

if (process.argv.includes(STAGED_FLAG)) {
  scanStagedContent()
} else {
  scanWorkingTree()
}