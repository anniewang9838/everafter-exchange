import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { auth } from '../lib/firebase'
import pool from '../db/client'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'

const router = Router()

// ── Schemas ───────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  firebaseUid: z.string().min(1),
})

const buyerOnboardingSchema = z.object({
  weddingDate: z.string().optional().nullable(),
  venueStyle: z
    .enum(['modern', 'rustic', 'garden', 'vintage', 'boho', 'ballroom', 'other'])
    .optional()
    .nullable(),
  colorPalette: z.array(z.string()).max(5).optional().nullable(),
  guestCount: z.number().int().positive().optional().nullable(),
  decorBudgetMin: z.number().positive().optional().nullable(),
  decorBudgetMax: z.number().positive().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  pickupRadiusMiles: z.number().int().positive().optional().nullable(),
})

const sellerOnboardingSchema = z.object({
  zipCode: z.string().optional().nullable(),
  pickupRadiusMiles: z.number().int().positive().optional().nullable(),
  sellerBio: z.string().max(500).optional().nullable(),
})

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['buyer', 'seller', 'both']).optional(),
})

// ── POST /auth/signup ─────────────────────────────────────────────────────────
// Called once after Firebase creates the user — creates the internal DB record

router.post('/signup', validate(signupSchema), async (req: Request, res: Response) => {
  const { name, email, firebaseUid } = req.body

  try {
    await auth.getUser(firebaseUid)

    const existing = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1 OR email = $2',
      [firebaseUid, email]
    )
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'User already exists' },
      })
      return
    }

    const id = uuidv4()
    const result = await pool.query(
      `INSERT INTO users (id, firebase_uid, name, email)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, onboarding_complete, is_verified`,
      [id, firebaseUid, name, email]
    )

    const u = result.rows[0]
    res.status(201).json({
      success: true,
      data: {
        id: u.id,
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
      `SELECT id, name, email, role, onboarding_complete,
              wedding_date, venue_style, color_palette, guest_count,
              decor_budget_min, decor_budget_max, zip_code,
              pickup_radius_miles, seller_bio, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    )

    if (!result.rowCount) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
      return
    }

    const u = result.rows[0]
    res.json({
      success: true,
      data: {
        id: u.id,
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
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch user' },
    })
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
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to save onboarding data' },
      })
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
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to save onboarding data' },
      })
    }
  }
)

// ── PATCH /auth/me ────────────────────────────────────────────────────────────

router.patch('/me', authenticate, validate(updateProfileSchema), async (req: Request, res: Response) => {
  const { name, role } = req.body
  try {
    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        role = COALESCE($2::user_role, role)
       WHERE id = $3
       RETURNING id, name, email, role, onboarding_complete, is_verified`,
      [name ?? null, role ?? null, req.user!.id]
    )
    const u = result.rows[0]
    res.json({
      success: true,
      data: {
        id: u.id, name: u.name, email: u.email,
        role: u.role, onboardingComplete: u.onboarding_complete,
        isVerified: u.is_verified,
      },
    })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update profile' },
    })
  }
})

export default router
