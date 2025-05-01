import http from 'http'
import fs from 'fs'
import path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const port = process.env.PORT || 8080

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'
const baseDir = path.resolve(__dirname, 'html')

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400)
    res.end('Bad Request')
    return
  }

  const requestURL = new URL(req.url, `http://${req.headers.host}`)
  let pathname = requestURL.pathname
  if (pathname.endsWith('/')) pathname += 'index.html'

  const filePath = path.join(baseDir, pathname)
  const ext = path.extname(filePath)

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const contentType = mimeTypes[ext] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': contentType })
      fs.createReadStream(filePath).pipe(res)
    } else {
      // fallback to index.html for SPA
      const fallbackPath = path.join(baseDir, 'index.html')
      fs.readFile(fallbackPath, (fallbackErr, data) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('404 Not Found')
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(data)
        }
      })
    }
  })
})

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`)
})
