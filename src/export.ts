import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import Database from 'better-sqlite3-multiple-ciphers'
import { decryptAttachmentBufferNode } from './decrypt.js'
import { formatConversationId, sanitizeFilename } from './utils.js'

export async function exportSessionData(args: {
  input?: string
  output: string
  password?: string
  'skip-attachments'?: boolean
}) {
  const defaultPath =
    process.platform === 'darwin'
      ? path.resolve(os.homedir(), 'Library/Application Support/Session')
      : path.resolve(os.homedir(), '.config/Session')

  const inputDirectory = path.resolve(args.input ?? defaultPath)
  try {
    const objects = await fs.readdir(inputDirectory)
    if (
      !objects.length ||
      !objects.includes('sql') ||
      !objects.includes('config.json') ||
      !objects.includes('attachments.noindex')
    ) {
      throw new Error()
    }
  } catch {
    if (args.input) {
      console.error('Could not read', args.input, 'input directory')
    } else {
      console.error(
        'Could not locate Session data directory on your computer automatically. Please run with -i /path/to/session/directory flag.',
      )
    }
    process.exit(1)
  }

  const outputDirectory = args.output
  try {
    await fs.mkdir(outputDirectory, { recursive: true })
  } catch {
    console.error('Could not create output directory:', outputDirectory)
    process.exit(1)
  }
  const unencryptedDbPath = path.join(outputDirectory, 'db-unencrypted.sqlite')

  await fs.copyFile(
    path.join(inputDirectory, 'sql/db.sqlite'),
    unencryptedDbPath,
  )
  const db = new Database(unencryptedDbPath)
  let dbEncryptionKey: string
  try {
    const { key } = JSON.parse(
      await fs.readFile(path.resolve(inputDirectory, 'config.json'), 'utf-8'),
    )
    dbEncryptionKey = key as string
  } catch (e) {
    console.error('Could not read config.json file in input directory:', e)
    process.exit(1)
  }

  try {
    db.pragma(`cipher='sqlcipher'`)
    db.pragma(`legacy=4`)
    db.exec(
      `PRAGMA key=${/^[0-9a-f]{64}$/i.test(dbEncryptionKey) ? `"x'${dbEncryptionKey}'"` : `'${dbEncryptionKey}'`};`,
    )
    db.exec(`PRAGMA rekey;`)
    console.log('Decrypted database successfully:', unencryptedDbPath)
  } catch {
    if (args.password) {
      console.error(
        'Could not decrypt database. You have likely specified the wrong password in the -p flag.',
      )
    } else {
      console.error(
        "Could not decrypt database. Please specify -p flag with the app's password.",
      )
    }
  }

  if (!args['skip-attachments']) {
    let attachmentsEncryptionKey: string
    try {
      const { value } = JSON.parse(
        db
          .prepare(
            "SELECT json FROM items WHERE id='local_attachment_encrypted_key';",
          )
          .pluck()
          .get() as string,
      )
      attachmentsEncryptionKey = value as string
    } catch (e) {
      console.error('Could not read media encryption key from database:', e)
      process.exit(1)
    }

    let exportedFilenames = 0
    const fileNames: string[] = []
    console.log('Decrypting media...')
    const attachmentsOutputDir = path.join(outputDirectory, 'attachments')
    await fs.mkdir(attachmentsOutputDir, { recursive: true })
    const attchmentsDirectory = path.resolve(
      inputDirectory,
      'attachments.noindex',
    )
    const attchmentsSubdirectories = await fs.readdir(attchmentsDirectory)
    let lastProgress = 0
    for (let i = 0; i < attchmentsSubdirectories.length; i++) {
      const attachmentSubdirectory = attchmentsSubdirectories[i]!
      const progress = Math.round((i / attchmentsSubdirectories.length) * 100)
      if (progress - lastProgress >= 10) {
        console.log(i + '/' + attchmentsSubdirectories.length, progress + '%')
        lastProgress = progress
      }
      try {
        if (attachmentSubdirectory === '.DS_Store') continue
        const files = await fs.readdir(
          path.resolve(attchmentsDirectory, attachmentSubdirectory),
        )
        for (const fileName of files) {
          if (fileName === '.DS_Store') continue
          try {
            const filePath = path.resolve(
              attchmentsDirectory,
              attachmentSubdirectory,
              fileName,
            )
            if ((await fs.stat(filePath)).isFile()) {
              const fileData = await fs.readFile(filePath)
              const decryptedData = await decryptAttachmentBufferNode(
                new Uint8Array(Buffer.from(attachmentsEncryptionKey, 'hex')),
                fileData.buffer as ArrayBuffer,
              )
              if (decryptedData) {
                const outputFilePath = path.join(
                  attachmentsOutputDir,
                  path.basename(filePath),
                )
                await fs.writeFile(outputFilePath, decryptedData)
                fileNames.push(fileName)
                exportedFilenames++
              } else {
                console.error(`Failed to decrypt: ${filePath}`)
              }
            }
          } catch (e) {
            console.error('Error while decrypting', fileName, e)
          }
        }
      } catch {
        console.error('Error while decrypting', attachmentSubdirectory)
      }
    }
    console.log('Successfully exported ' + exportedFilenames + ' files')

    console.log('Remapping media filenames...')
    const mediaFileNames = new Map<string, { name: string; thumb: boolean }>()
    const messagesWithAttachments = db
      .prepare<
        [],
        { json: string }
      >('SELECT * FROM messages WHERE hasAttachments = 1;')
      .all()
    for (const message of messagesWithAttachments) {
      try {
        const { attachments } = JSON.parse(message.json)
        for (const attachment of attachments) {
          if (attachment.path) {
            mediaFileNames.set(path.basename(attachment.path), {
              name: attachment.fileName,
              thumb: false,
            })
          }
          if (attachment.thumbnail) {
            mediaFileNames.set(path.basename(attachment.thumbnail.path), {
              name: attachment.fileName,
              thumb: true,
            })
          }
        }
      } catch {
        // skip
      }
    }
    const avatars = db
      .prepare<
        [],
        { id: string; avatarInProfile: string }
      >('SELECT id, avatarInProfile FROM conversations WHERE avatarInProfile IS NOT NULL;')
      .all()
    for (const avatar of avatars) {
      try {
        mediaFileNames.set(path.basename(avatar.avatarInProfile), {
          name: 'avatar_' + formatConversationId(avatar.id) + '.jpeg',
          thumb: false,
        })
      } catch {
        // skip
      }
    }
    const usedFileNames: Map<string, number> = new Map()
    let remappedFiles = 0
    const remappingMap = new Map<string, string>()
    for (const fileId of fileNames) {
      const realFilenameObject = mediaFileNames.get(fileId)
      if (!realFilenameObject) continue
      if (realFilenameObject.name === 'map.json')
        realFilenameObject.name = '_map.json'
      const prefix = realFilenameObject.thumb ? 'thumb_' : ''
      const realFilename = prefix + (realFilenameObject.name || 'unnamed')
      const usedTimes = usedFileNames.get(realFilename) ?? 0
      const suffix = usedTimes > 0 ? `_(${usedTimes})` : ''
      const extname = path.extname(realFilename)
      const realFilenameWithSuffix = sanitizeFilename(
        (extname ? realFilename.slice(0, -extname.length) : realFilename) +
          suffix +
          extname,
      )
      // if (!realFilenameWithSuffix) realFilenameWithSuffix = realFilename
      await fs.rename(
        path.join(attachmentsOutputDir, fileId),
        path.join(attachmentsOutputDir, realFilenameWithSuffix),
      )
      remappingMap.set(fileId, realFilenameWithSuffix)
      usedFileNames.set(
        realFilename,
        (usedFileNames.get(realFilename) ?? 0) + 1,
      )
      remappedFiles++
    }
    await fs.writeFile(
      path.join(attachmentsOutputDir, 'map.json'),
      JSON.stringify(Object.fromEntries(remappingMap.entries())),
      'utf-8',
    )
    console.log(
      'Successfully remapped ' +
        remappedFiles +
        ' files to their original names',
    )
  }
}
