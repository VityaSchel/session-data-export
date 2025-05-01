# Session messenger data export

This CLI tool helps you dump your Session Desktop electron app messenger local data.

Features:

- Export decrypted database with all app data
- Export all downloaded attachments (files, images, media) with their original filenames
- Transform decrypted database into human-readable local mini-website with all your conversations history
- Transform database to grouped conversation-based folders with grouped attachments and data and use web frontend to view it

![Frontend](https://github.com/user-attachments/assets/9c0989bc-1e55-4bd0-be31-241be5382e60)

Based on my explanation [here](https://gist.github.com/VityaSchel/0d4dcf2ada60c3e1b05bd7ef15f0cfd1)

> [!IMPORTANT]
> I'm looking for a job! Interested in hiring me? Visit [cv.hloth.dev](https://cv.hloth.dev) to review my resume & CV.

## Usage

1. Clone repository
2. Install LTS Node.js: `nvm install --lts` (requires [nvm.sh](https://nvm.sh))
3. Install dependencies: `npm install`. At this point you might get errors about native dependencies compilation — please investigate them and fix, they're not related to code of this project. Usually you're missing some dependencies required to build them.
4. Build the project: `npm run build`

Now you're ready to export your data!

5. Run: `node out/index.js export -o /path/to/output/directory` — this will try to locate Session data directory on your computer and decrypt database along with all attachments and try to find their original filenames

If you have set a custom Session app password, you must specify it with -p flag: `node out/index.js export -p mypassword -o /path/to/output/directory`

If you have set a custom Session data directory or CLI can't locate it automatically, specify it with -i: `node out/index.js export -p mypassword -i /path/to/session/data/dir -o /path/to/output/directory`

You can also skip attachments decryption if you want because it takes significant amount of time, especially if you have tens of thousands media files saved: `--skip-attachments`. I don't recommend it as you won't be able to complete the next step.

6. Now that you have your data decrypted in /path/to/output/directory you can already browse it with SQL browsers and peek at all media files. But you also might want to view this data as conversations, not stream of messages table rows. This is where you want to generate a small website that will work locally on your computer and load data from that output directory. Go to the repository in terminal and run this command: `node out/index.js html /path/to/output/directory`. This will generate the website in the output directory which you can run with any SPA webserver. For simplicity, this command also puts a node.js script that starts up webserver with your mini website called start-web.js. Just run `node /path/to/output/directory/start-web.js` and go to http://localhost:8080/ in your browser and you should see all your conversations safely preserved.

## Donate

[hloth.dev/donate](https://hloth.dev/donate)

## License

[MIT](./LICENSE.md)
