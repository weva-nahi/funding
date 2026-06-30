export function extractError(err: unknown, fallback = 'Something went wrong.'): string {
  const ax = err as { response?: { data?: unknown } }
  const data = ax?.response?.data

  if (!data) return fallback
  if (typeof data === 'string') return data

  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>

    if (typeof d.error === 'object' && d.error !== null) {
      const e = d.error as Record<string, unknown>
      if (typeof e.message === 'string' && e.message) return e.message
    }

    if (typeof d.detail === 'string' && d.detail) return d.detail

    const keys = Object.keys(d).filter((k) => k !== 'success')
    for (const key of keys) {
      const val = d[key]
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
        return `${key !== 'non_field_errors' ? key + ': ' : ''}${val[0]}`
      }
      if (typeof val === 'string' && val) {
        return `${key !== 'non_field_errors' ? key + ': ' : ''}${val}`
      }
    }
  }

  return fallback
}