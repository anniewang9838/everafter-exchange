import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { auth } from '../lib/firebase'
import pool from '../db/client'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'

const router = Router()

// ── Schemas ───────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  username:    z.string()
                .min(3, 'Username must be at least 3 characters')
                .max(30, 'Username must be 30 characters or less')
                .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  name:        z.string().min(1).max(100),
  email:       z.string().email(),
  firebaseUid: z.string().min(1),
  role:        z.enum(['buyer', 'seller']),
})

const buyerOnboardingSchema = z.object({
  weddingDate:       z.string().optional().nullable(),
  venueStyle:        z.enum(['modern','rustic','garden','vintage','boho','ballroom','other']).optional().nullable(),
  colorPalette:      z.array(z.string()).max(5).optional().nullable(),
  guestCount:        z.number().int().positive().optional().nullable(),
  decorBudgetMin:    z.number().positive().optional().nullable(),
  decorBudgetMax:    z.number().positive().optional().nullable(),
  zipCode:           z.string().optional().nullable(),
  pickupRadiusMiles: z.number().int().positive().optional().nullable(),
})

const sellerOnboardingSchema = z.object({
  zipCode:           z.string().optional().nullable(),
  pickupRadiusMiles: z.number().int().positive().optional().nullable(),
  sellerBio:         z.string().max(500).optional().nullable(),
})

const updateProfileSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
  role:     z.enum(['buyer', 'seller', 'both']).optional(),
})

// ── POST /auth/signup ─────────────────────────────────────────────────────────

router.post('/signup', validate(signupSchema), async (req: Request, res: Response) => {
  const { username, name, email, firebaseUid, role } = req.body

  try {
    // Verify the Firebase UID actually exists
    await auth.getUser(firebaseUid)

    // Check for duplicates
    const existing = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1 OR email = $2 OR lower(username) = lower($3)',
      [firebaseUid, email, username]
    )
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'Email or username is already taken' },
      })
      return
    }

    const result = await pool.query(
      `INSERT INTO users (firebase_uid, username, name, email, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, email, role, onboarding_complete, is_verified`,
      [firebaseUid, username.toLowerCase(), name, email, role]
    )

    const u = result.rows[0]
    res.status(201).json({
      success: true,
      data: {
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        onboardingComplete: u.onboarding_complete,
        isVerified: u.is_verified,
      },
    })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create user' },
    })
  }
})

// ── GET /auth/me ──────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, username, name, email, role, onboarding_complete,
              wedding_date, venue_style, color_palette, guest_count,
              decor_budget_min, decor_budget_max, zip_code,
              pickup_radius_miles, seller_bio, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    )

    if (!result.rowCount) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } })
      return
    }

    const u = result.rows[0]
    res.json({
      success: true,
      data: {
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        onboardingComplete: u.onboarding_complete,
        weddingDate: u.wedding_date,
        venueStyle: u.venue_style,
        colorPalette: u.color_palette,
        guestCount: u.guest_count,
        decorBudgetMin: u.decor_budget_min,
        decorBudgetMax: u.decor_budget_max,
        zipCode: u.zip_code,
        pickupRadiusMiles: u.pickup_radius_miles,
        sellerBio: u.seller_bio,
        isVerified: u.is_verified,
        createdAt: u.created_at,
      },
    })
  } catch (err) {
    console.error('Get me error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch user' } })
  }
})

// ── PATCH /auth/me/onboarding/buyer ───────────────────────────────────────────

router.patch(
  '/me/onboarding/buyer',
  authenticate,
  validate(buyerOnboardingSchema),
  async (req: Request, res: Response) => {
    const { weddingDate, venueStyle, colorPalette, guestCount,
            decorBudgetMin, decorBudgetMax, zipCode, pickupRadiusMiles } = req.body
    try {
      await pool.query(
        `UPDATE users SET
          role = CASE WHEN role = 'seller' THEN 'both'::user_role ELSE 'buyer'::user_role END,
          wedding_date        = COALESCE($1, wedding_date),
          venue_style         = COALESCE($2::venue_style, venue_style),
          color_palette       = COALESCE($3, color_palette),
          guest_count         = COALESCE($4, guest_count),
          decor_budget_min    = COALESCE($5, decor_budget_min),
          decor_budget_max    = COALESCE($6, decor_budget_max),
          zip_code            = COALESCE($7, zip_code),
          pickup_radius_miles = COALESCE($8, pickup_radius_miles),
          onboarding_complete = TRUE
        WHERE id = $9`,
        [weddingDate ?? null, venueStyle ?? null, colorPalette ?? null,
         guestCount ?? null, decorBudgetMin ?? null, decorBudgetMax ?? null,
         zipCode ?? null, pickupRadiusMiles ?? null, req.user!.id]
      )
      res.json({ success: true, data: { onboardingComplete: true } })
    } catch (err) {
      console.error('Buyer onboarding error:', err)
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save onboarding data' } })
    }
  }
)

// ── PATCH /auth/me/onboarding/seller ──────────────────────────────────────────

router.patch(
  '/me/onboarding/seller',
  authenticate,
  validate(sellerOnboardingSchema),
  async (req: Request, res: Response) => {
    const { zipCode, pickupRadiusMiles, sellerBio } = req.body
    try {
      await pool.query(
        `UPDATE users SET
          role = CASE WHEN role = 'buyer' THEN 'both'::user_role ELSE 'seller'::user_role END,
          zip_code            = COALESCE($1, zip_code),
          pickup_radius_miles = COALESCE($2, pickup_radius_miles),
          seller_bio          = COALESCE($3, seller_bio),
          onboarding_complete = TRUE
        WHERE id = $4`,
        [zipCode ?? null, pickupRadiusMiles ?? null, sellerBio ?? null, req.user!.id]
      )
      res.json({ success: true, data: { onboardingComplete: true } })
    } catch (err) {
      console.error('Seller onboarding error:', err)
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save onboarding data' } })
    }
  }
)

// ── PATCH /auth/me ────────────────────────────────────────────────────────────

router.patch('/me', authenticate, validate(updateProfileSchema), async (req: Request, res: Response) => {
  const { name, username, role } = req.body
  try {
    // Check username uniqueness if changing it
    if (username) {
      const taken = await pool.query(
        'SELECT id FROM users WHERE lower(username) = lower($1) AND id != $2',
        [username, req.user!.id]
      )
      if (taken.rowCount && taken.rowCount > 0) {
        res.status(409).json({ success: false, error: { code: 'USERNAME_TAKEN', message: 'Username is already taken' } })
        return
      }
    }

    const result = await pool.query(
      `UPDATE users SET
        name     = COALESCE($1, name),
        username = COALESCE($2, username),
        role     = COALESCE($3::user_role, role)
       WHERE id = $4
       RETURNING id, username, name, email, role, onboarding_complete, is_verified`,
      [name ?? null, username?.toLowerCase() ?? null, role ?? null, req.user!.id]
    )
    const u = result.rows[0]
    res.json({
      success: true,
      data: {
        id: u.id, username: u.username, name: u.name, email: u.email,
        role: u.role, onboardingComplete: u.onboarding_complete, isVerified: u.is_verified,
      },
    })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update profile' } })
  }
})

export default router
