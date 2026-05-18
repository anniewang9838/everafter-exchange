import { Request, Response, NextFunction } from 'express'
import { auth } from '../lib/firebase'
import pool from '../db/client'

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string
      firebaseUid: string
      email: string
      role: string
      onboardingComplete: boolean
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' },
    })
    return
  }

  const token = header.split('Bearer ')[1]

  try {
    const decoded = await auth.verifyIdToken(token)

    const result = await pool.query(
      `SELECT id, firebase_uid, email, role, onboarding_complete
       FROM users WHERE firebase_uid = $1`,
      [decoded.uid]
    )

    if (!result.rowCount) {
      res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found in database' },
      })
      return
    }

    const row = result.rows[0]
    req.user = {
      id: row.id,
      firebaseUid: row.firebase_uid,
      email: row.email,
      role: row.role,
      onboardingComplete: row.onboarding_complete,
    }

    next()
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token verification failed' },
    })
  }
}
