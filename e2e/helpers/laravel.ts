import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function lastOutputLine(output: string): string {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.at(-1) ?? ''
}

function hostPhpSupportsE2e(): boolean {
  try {
    execSync('php -r \'exit(version_compare(PHP_VERSION, "8.4.0", ">=") ? 0 : 1);\'', {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return true
  } catch {
    return false
  }
}

function runTinker(php: string): string {
  const statement = php.trim().endsWith(';') ? php.trim() : `${php.trim()};`
  const tinker = `php artisan tinker --execute=${JSON.stringify(statement)} --env=e2e --no-ansi`

  const commands: string[] = []
  if (hostPhpSupportsE2e()) {
    commands.push(tinker)
  }
  commands.push(`docker compose run --rm --no-deps -T app ${tinker}`)

  let lastError: unknown

  for (const command of commands) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return execSync(command, {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim()
      } catch (error) {
        lastError = error
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not run artisan tinker for e2e helpers. Use PHP 8.4 locally or Docker.')
}

/** Create a password reset token against the e2e sqlite database. */
export function createPasswordResetToken(email: string): string {
  const safeEmail = email.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const output = runTinker(
    `echo Illuminate\\Support\\Facades\\Password::createToken(App\\Models\\User::where('email', '${safeEmail}')->firstOrFail())`,
  )
  const token = lastOutputLine(output)

  if (token.length < 40) {
    throw new Error(`Unexpected reset token output: ${output}`)
  }

  return token
}

/** Restore a seeded user's password after recovery e2e tests. */
export function setUserPassword(email: string, password: string): void {
  const safeEmail = email.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const safePassword = password.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  runTinker(
    `$user = App\\Models\\User::where('email', '${safeEmail}')->firstOrFail(); $user->password = Illuminate\\Support\\Facades\\Hash::make('${safePassword}'); $user->save(); echo 'ok';`,
  )
}
