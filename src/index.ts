import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { exportSessionData } from './export.js'
import { createHtmlSite } from './html-site.js'

await yargs(hideBin(process.argv))
  .command(
    'export',
    'Export your Session app database as decrypted sql file and decrypt all media files. Pass --skip-attachments to skip decrypting media files.',
    (yargs) =>
      yargs
        .usage(
          'Usage: $0 export [-i /path/to/session/directory] [-p yourpassword] -o /path/to/output/directory',
        )
        .option('skip-attachments', {
          describe: 'Skip exporting attachments',
          type: 'boolean',
        })
        .option('input', {
          alias: 'i',
          describe: 'Path to Session data directory',
          type: 'string',
        })
        .option('password', {
          alias: 'p',
          type: 'string',
          description: 'Password to the app if you have set it',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output directory',
          demandOption: true,
        }),
    async (args) => {
      await exportSessionData(args)
    },
  )
  .command(
    'html <input>',
    'Convert the exported database to mini HTML website for easy viewing. Pass path to the directory that you specified with `export` command as argument.',
    (yargs) =>
      yargs
        .usage('Usage: $0 html /path/to/output/directory')
        .positional('input', {
          describe: 'Path to the exported Session data directory',
          type: 'string',
          demandOption: true,
        }),
    async (args) => {
      await createHtmlSite(args)
    },
  )
  .demandCommand()
  .locale('en')
  .parse()
