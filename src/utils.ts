export const formatConversationId = (id: string) => {
  if (/^https?:\/\//.test(id)) {
    const sog = new URL(id)
    return sog.hostname + sog.pathname.replaceAll('/', '_')
  } else {
    return id
  }
}