export function shortSessionId(id: string) {
  if (id.length === 66 && /^[a-f0-9]+$/.test(id)) return `(${id.slice(0, 4)}...${id.slice(-4)})`
  else return id
}

export function sameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}
