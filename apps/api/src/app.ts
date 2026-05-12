import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import listingsRouter from './routes/listings'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// Health check — visit http://localhost:4000/health to confirm API is running
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/auth',     authRouter)
app.use('/listings', listingsRouter)

// app.use('/offers',   offersRouter)   — Phase 4
// app.use('/orders',   ordersRouter)   — Phase 4
// app.use('/messages', messagesRouter) — Phase 4

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
  })
})

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`)
})

export default app
