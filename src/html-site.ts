import Database from 'better-sqlite3-multiple-ciphers'
import path from 'path'
import fs from 'fs/promises'
import _ from 'lodash'
import { formatConversationId } from './utils.js'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'

type DbConversation = {
  id: string
  active_at: number
  type: 'private' | 'group'
  members: string[]
  displayNameInProfile: string
  avatarInProfile: string | null
  lastMessage: string | null
  lastMessageStatus: string | null
}

type DbSogs = {
  serverUrl: string
  roomId: string
  conversationId: string
}

type DbMessage = {
  id: string
  json: string
  sent_at: number
  conversationId: string
  source: string
  type: 'incoming' | 'outgoing'
  parsedJson: DbMessageJson
}

type DbMessageJson = {
  attachments: {
    contentType: string
    size: number
    fileName: string
    path?: string
    src: string
  }[]
}

export async function createHtmlSite(args: { input: string }) {
  const unencryptedDbPath = path.join(args.input, 'db-unencrypted.sqlite')
  const db = new Database(unencryptedDbPath, {
    fileMustExist: true,
    readonly: true,
  })
  const attachmentsPath = path.join(args.input, 'attachments')
  let mediaFilesMap: Record<string, string> = {}
  try {
    mediaFilesMap = JSON.parse(
      await fs.readFile(path.join(attachmentsPath, 'map.json'), 'utf-8'),
    )
  } catch {
    console.error(
      'Failed to read attachments/map.json file. Make sure you have exported the attachments with `export` command.',
    )
    process.exit(1)
  }
  console.log('Retrieving conversations...')
  const conversations = await db
    .prepare<
      never[],
      DbConversation
    >('SELECT id, active_at, members, type, displayNameInProfile, avatarInProfile, lastMessage, lastMessageStatus FROM conversations;')
    .all()
  console.log('Retrieving sogs...')
  const sogs = await db
    .prepare<
      never[],
      DbSogs
    >('SELECT serverUrl, roomId, conversationId FROM openGroupRoomsV2;')
    .all()
  console.log('Retrieving messages...')
  const messages = await db
    .prepare<
      never[],
      DbMessage
    >('SELECT id, json, sent_at, conversationId, source, type FROM messages ORDER BY sent_at ASC;')
    .all()
  console.log('Mapping messages to conversations...')
  const conversationSets = new Map<string, DbMessage[]>()
  for (const message of messages) {
    const conversationId = message.conversationId
    if (!conversationSets.has(conversationId)) {
      conversationSets.set(conversationId, [])
    }
    conversationSets.get(conversationId)?.push(message)
  }

  console.log('Writing conversations to JSON...')

  const conversationsWithAvatars = new Set<string>()
  for (const conversation of conversations) {
    const conversationId = formatConversationId(conversation.id)

    const messages = conversationSets.get(conversationId)?.map((msg) => ({
      ...msg,
      parsedJson: JSON.parse(msg.json),
    }))

    const conversationPath = path.join(
      args.input,
      'html/data/conversations/',
      conversationId,
    )

    await fs.mkdir(conversationPath, { recursive: true })

    let hasAvatar = false
    if (conversation.avatarInProfile) {
      const fileName =
        mediaFilesMap[path.basename(conversation.avatarInProfile)]
      if (fileName) {
        try {
          await fs.copyFile(
            path.join(attachmentsPath, fileName),
            path.join(conversationPath, 'avatar.png'),
          )
          conversationsWithAvatars.add(conversationId)
          hasAvatar = true
        } catch {
          // ignore
        }
      }
    }

    if (messages) {
      let directoryCreated = false
      const conversationAttachmentsPath = path.join(
        args.input,
        'html/data/conversations/',
        conversationId,
        'attachments',
      )
      for (const message of messages) {
        const { attachments } = message.parsedJson
        if (!attachments || !attachments.length) continue
        if (!directoryCreated) {
          await fs.mkdir(conversationAttachmentsPath, { recursive: true })
          directoryCreated = true
        }
        for (const attachment of attachments) {
          if (!attachment.path) continue
          const fileName = mediaFilesMap[path.basename(attachment.path)]
          if (fileName) {
            try {
              await fs.copyFile(
                path.join(attachmentsPath, fileName),
                path.join(conversationAttachmentsPath, fileName),
              )
              attachment.src = fileName
            } catch {
              // ignore
            }
          }
        }
      }
    }

    const conversationMessagesChunks = _.chunk(messages, 1000).map((chunk) => {
      return chunk.map((message) => {
        const { id, sent_at, parsedJson, source, type } = message
        return {
          id,
          sentAt: sent_at,
          source,
          type,
          body: parsedJson.body,
          ...(parsedJson.attachments &&
            parsedJson.attachments.length > 0 && {
              attachments: parsedJson.attachments,
            }),
          ...(parsedJson.dataExtractionNotification && {
            dataExtractionNotification: parsedJson.dataExtractionNotification,
          }),
          ...(parsedJson.messageRequestResponse && {
            messageRequestResponse: parsedJson.messageRequestResponse,
          }),
        }
      })
    })

    await fs.writeFile(
      path.join(conversationPath, 'conversation.json'),
      JSON.stringify({
        title: conversation.displayNameInProfile,
        type: conversation.type,
        members: conversation.members,
        avatar: hasAvatar,
        messagesFiles: conversationMessagesChunks.length,
        sog: sogs.some((s) => s.conversationId == conversation.id),
      }),
      'utf-8',
    )

    for (let i = 0; i < conversationMessagesChunks.length; i++) {
      const chunk = conversationMessagesChunks[i]
      const chunkFileName = path.join(
        conversationPath,
        'messages_' + (i + 1) + '.json',
      )
      await fs.writeFile(chunkFileName, JSON.stringify(chunk), 'utf-8')
    }
  }

  await fs.writeFile(
    path.join(args.input, 'html/data/conversations/conversations.json'),
    JSON.stringify(
      conversations
        .sort((a, b) => b.active_at - a.active_at)
        .map((conversation) => ({
          id: formatConversationId(conversation.id),
          title: conversation.displayNameInProfile,
          avatar: conversationsWithAvatars.has(
            formatConversationId(conversation.id),
          ),
          lastMessage: conversation.lastMessage,
          lastMessageOutgoing: conversation.lastMessageStatus !== null,
        })),
    ),
    'utf-8',
  )

  await fs.cp(
    path.resolve(__dirname, '../html/build'),
    path.resolve(args.input, 'html'),
    {
      recursive: true,
    },
  )

  await fs.writeFile(
    path.resolve(args.input, 'start-web.js'),
    await fs.readFile(path.resolve(__dirname, 'webserver.js'), 'utf-8'),
  )
}
