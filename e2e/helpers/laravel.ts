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

function runTinker(php: string): string {
  const statement = php.trim().endsWith(';') ? php.trim() : `${php.trim()};`
  const command = `php artisan tinker --execute=${JSON.stringify(statement)} --env=e2e --no-ansi`
  const dockerCommand = `docker compose run --rm --no-deps app ${command}`

  for (const attempt of [command, dockerCommand]) {
    try {
      return execSync(attempt, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim()
    } catch {
      // Try docker when host PHP is unavailable (common on Mac without PHP 8.4).
    }
  }

  throw new Error('Could not run artisan tinker for e2e helpers. Use PHP 8.4 locally or Docker.')
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
