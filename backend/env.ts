export class ConfigError extends Error {}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new ConfigError(`Thiếu biến môi trường ${name}.`)
  return value
}

export function mongoUri(): string {
  return required('MONGODB_URI')
}

export function mongoDbName(): string {
  return process.env.MONGODB_DB || 'vocab'
}

export function appPassword(): string {
  return required('APP_PASSWORD')
}

export function authSecret(): string {
  const secret = required('AUTH_SECRET')
  if (secret.length < 32) throw new ConfigError('AUTH_SECRET cần dài ít nhất 32 ký tự.')
  return secret
}
