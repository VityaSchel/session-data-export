# Session messenger data export

This CLI exports decrypted database file from Session messenger and decrypts attachments. This program only works with Session Desktop electron app.

Based on my explanation [here](https://gist.github.com/VityaSchel/0d4dcf2ada60c3e1b05bd7ef15f0cfd1)

> [!IMPORTANT]
> I'm looking for a job! Interested in hiring me? Visit [cv.hloth.dev](https://cv.hloth.dev) to review my resume & CV.

## Usage

1. Clone repository
2. Install LTS Node.js: `nvm install --lts` (requires [nvm.sh](https://nvm.sh))
3. Install dependencies: `npm install`. At this point you might get errors about native dependencies compilation — please investigate them and fix, they're not related to code of this project. Usually you're missing some dependencies required to build them.
4. Build the project: `npm run build`
5. Run: `node out/index.js -o /path/to/output/directory` — this will try to locate Session data directory on your computer and decrypt database along with all attachments and try to find their original filenames

If you have set a custom Session app password, you must specify it with -p flag: `node out/index.js -p mypassword -o /path/to/output/directory`

If you have set a custom Session data directory or CLI can't locate it automatically, specify it with -i: `node out/index.js -p mypassword -i /path/to/session/data/dir -o /path/to/output/directory`

## Donate

[hloth.dev/donate](https://hloth.dev/donate)

## License

[MIT](./LICENSE.md)
