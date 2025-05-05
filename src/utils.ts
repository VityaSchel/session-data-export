export const formatConversationId = (id: string) => {
  if (/^https?:\/\//.test(id)) {
    const sog = new URL(id)
    return sog.hostname + sog.pathname.replaceAll('/', '_')
  } else {
    return id
  }
}

export const sanitizeFilename = (filename: string) => {
  return filename.replace(/[^a-zA-Zа-яА-Я0-9._-]/g, '_')
}
