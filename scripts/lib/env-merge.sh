#!/usr/bin/env bash
# Shared .env helpers — source from other scripts (not meant to run directly).

env_merge_set_line() {
  local key="$1"
  local value="$2"
  local env_file="${3:-.env}"
  local tmp

  tmp="$(mktemp)"
  awk -v k="$key" -v v="$value" '
    BEGIN { done = 0 }
    $0 ~ "^" k "=" { print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }
  ' "$env_file" > "$tmp"
  mv "$tmp" "$env_file"
}

env_merge_get_value() {
  local key="$1"
  local file="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- || true
}

env_merge_from_secrets() {
  local secrets_file="${1:-.env.secrets}"
  local env_file="${2:-.env}"

  if [[ ! -f "$secrets_file" ]]; then
    return 0
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    local key="${line%%=*}"
    local value="${line#*=}"
    env_merge_set_line "$key" "$value" "$env_file"
  done < "$secrets_file"
}

env_merge_apply_docker_mysql() {
  local env_file="${1:-.env}"

  env_merge_set_line DB_CONNECTION mysql "$env_file"
  env_merge_set_line DB_HOST mysql "$env_file"
  env_merge_set_line DB_PORT 3306 "$env_file"
  env_merge_set_line DB_DATABASE flotory_app "$env_file"
  env_merge_set_line DB_USERNAME flotory "$env_file"
  env_merge_set_line DB_PASSWORD secret "$env_file"
  env_merge_set_line APP_ENV local "$env_file"
  env_merge_set_line APP_DEBUG true "$env_file"
}

env_merge_save_docker_backup() {
  local env_file="${1:-.env}"
  cp "$env_file" .env.docker.backup
}
