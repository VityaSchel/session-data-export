import { default as sodium } from 'libsodium-wrappers-sumo'
await sodium.ready

// https://github.com/oxen-io/session-desktop/blob/ee43d31665b54e8385edfaffc959c24725881e2d/ts/node/encrypt_attachment_buffer.ts#L3
export async function decryptAttachmentBufferNode(
  encryptingKey: Uint8Array,
  bufferIn: ArrayBuffer,
) {
  const header = new Uint8Array(
    bufferIn.slice(0, sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES),
  )

  const encryptedBuffer = new Uint8Array(
    bufferIn.slice(sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES),
  )
  const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
    header,
    new Uint8Array(encryptingKey),
  )
  const messageTag = sodium.crypto_secretstream_xchacha20poly1305_pull(
    state,
    encryptedBuffer,
  )
  if (
    messageTag.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
  ) {
    return messageTag.message
  }
}
