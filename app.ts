import process from 'node:process'
import express from 'express'
import indexController from './api/index'

const app = express()

app.use('/', indexController)

const port = Number(process.env.PORT) || 3015

const server = app.listen(port, () => {
  console.log(`Running on http://localhost:${port}`)
})

function gracefulShutdown() {
  console.log('Shutting down server...')
  server.close(() => {
    console.log('Server stopped.')
    process.exit(0)
  })
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
