export function match(value: string) {
  return /^[a-f0-9]{66}$/.test(value) || /^[a-z0-9_.-]+$/i.test(value)
}