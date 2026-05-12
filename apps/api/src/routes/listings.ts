import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pool from '../db/client'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { getPresignedUploadUrl } from '../lib/s3'

const router = Router()

// ── Enum constants ────────────────────────────────────────────────────────────

const LISTING_CONDITIONS  = ['like_new', 'excellent', 'good', 'fair'] as const
const LISTING_CATEGORIES  = ['centerpieces', 'table_runners', 'candles', 'signage', 'arch_arbor', 'linens', 'lighting', 'floral', 'other'] as const
const VENUE_STYLES        = ['modern', 'rustic', 'garden', 'vintage', 'boho', 'ballroom', 'other'] as const

// ── Zod schemas ───────────────────────────────────────────────────────────────

const uploadUrlSchema = z.object({
  filename:    z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/, 'Only JPEG, PNG, or WebP allowed'),
})

const createListingSchema = z.object({
  title:                z.string().min(1).max(150),
  description:          z.string().min(1).max(2000),
  price:                z.number().positive(),
  originalRetailPrice:  z.number().positive().optional().nullable(),
  condition:            z.enum(LISTING_CONDITIONS),
  category:             z.enum(LISTING_CATEGORIES),
  venueStyle:           z.enum(VENUE_STYLES).optional().nullable(),
  imageUrls:            z.array(z.string().url()).min(1).max(5),
})

const updateListingSchema = z.object({
  title:                z.string().min(1).max(150).optional(),
  description:          z.string().min(1).max(2000).optional(),
  price:                z.number().positive().optional(),
  originalRetailPrice:  z.number().positive().optional().nullable(),
  condition:            z.enum(LISTING_CONDITIONS).optional(),
  category:             z.enum(LISTING_CATEGORIES).optional(),
  venueStyle:           z.enum(VENUE_STYLES).optional().nullable(),
  imageUrls:            z.array(z.string().url()).min(1).max(5).optional(),
  status:               z.enum(['active', 'inactive']).optional(),
})

const feedQuerySchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(50).default(20),
  category:   z.enum(LISTING_CATEGORIES).optional(),
  venueStyle: z.enum(VENUE_STYLES).optional(),
  condition:  z.enum(LISTING_CONDITIONS).optional(),
  minPrice:   z.coerce.number().positive().optional(),
  maxPrice:   z.coerce.number().positive().optional(),
  search:     z.string().optional(),
})

// ── SQL helpers ───────────────────────────────────────────────────────────────

const LISTING_SELECT = `
  SELECT
    l.id,
    l.seller_id,
    l.title,
    l.description,
    l.price,
    l.original_retail_price,
    l.status,
    l.condition,
    l.category,
    l.venue_style,
    l.created_at,
    l.updated_at,
    u.username    AS seller_username,
    u.name        AS seller_name,
    u.is_verified AS seller_is_verified,
    COALESCE(
      json_agg(
        json_build_object(
          'id',           li.id,
          'listingId',    li.listing_id,
          'imageUrl',     li.image_url,
          'displayOrder', li.display_order,
          'createdAt',    li.created_at
        ) ORDER BY li.display_order
      ) FILTER (WHERE li.id IS NOT NULL),
      '[]'
    ) AS images
  FROM listings l
  JOIN      users          u  ON u.id         = l.seller_id
  LEFT JOIN listing_images li ON li.listing_id = l.id
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatRow(row: Record<string, any>) {
  return {
    id:                 row.id,
    sellerId:           row.seller_id,
    title:              row.title,
    description:        row.description,
    price:              parseFloat(row.price),
    originalRetailPrice: row.original_retail_price ? parseFloat(row.original_retail_price) : null,
    status:             row.status,
    condition:          row.condition,
    category:           row.category,
    venueStyle:         row.venue_style ?? null,
    images:             row.images,
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
    seller: {
      id:         row.seller_id,
      username:   row.seller_username,
      name:       row.seller_name,
      isVerified: row.seller_is_verified,
    },
  }
}

async function fetchListing(id: string) {
  const r = await pool.query(
    `${LISTING_SELECT} WHERE l.id = $1 GROUP BY l.id, u.id`,
    [id],
  )
  return r.rowCount ? formatRow(r.rows[0]) : null
}

// ── POST /listings/upload-url ─────────────────────────────────────────────────

router.post('/upload-url', authenticate, validate(uploadUrlSchema), async (req: Request, res: Response) => {
  try {
    const { filename, contentType } = req.body
    const result = await getPresignedUploadUrl(req.user!.id, filename, contentType)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Presign error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Could not generate upload URL' } })
  }
})

// ── GET /listings/my ─────────────────────────────────────────────────────────

router.get('/my', authenticate, async (req: Request, res: Response) => {
  const page  = Math.max(1,  parseInt(String(req.query.page  ?? 1)))
  const limit = Math.min(50, parseInt(String(req.query.limit ?? 20)))
  const offset = (page - 1) * limit

  try {
    const [countResult, feedResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM listings WHERE seller_id = $1', [req.user!.id]),
      pool.query(
        `${LISTING_SELECT}
         WHERE l.seller_id = $1
         GROUP BY l.id, u.id
         ORDER BY l.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user!.id, limit, offset],
      ),
    ])

    const total = parseInt(countResult.rows[0].count)
    res.json({
      success: true,
      data: {
        items:   feedResult.rows.map(formatRow),
        total,
        page,
        limit,
        hasMore: offset + feedResult.rows.length < total,
      },
    })
  } catch (err) {
    console.error('My listings error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch listings' } })
  }
})

// ── POST /listings ────────────────────────────────────────────────────────────

router.post('/', authenticate, validate(createListingSchema), async (req: Request, res: Response) => {
  if (!['seller', 'both'].includes(req.user!.role)) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only sellers can create listings' } })
    return
  }

  const { title, description, price, originalRetailPrice, condition, category, venueStyle, imageUrls } = req.body
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
       VALUES ($1, $2, $3, $4, $5, $6::listing_condition, $7::listing_category, $8::venue_style)
       RETURNING id`,
      [req.user!.id, title, description, price, originalRetailPrice ?? null, condition, category, venueStyle ?? null],
    )
    const listingId = rows[0].id

    for (let i = 0; i < imageUrls.length; i++) {
      await client.query(
        'INSERT INTO listing_images (listing_id, image_url, display_order) VALUES ($1, $2, $3)',
        [listingId, imageUrls[i], i],
      )
    }

    await client.query('COMMIT')
    const listing = await fetchListing(listingId)
    res.status(201).json({ success: true, data: listing })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Create listing error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create listing' } })
  } finally {
    client.release()
  }
})

// ── GET /listings ─────────────────────────────────────────────────────────────

router.get('/', authenticate, validate(feedQuerySchema, 'query'), async (req: Request, res: Response) => {
  const { page, limit, category, venueStyle, condition, minPrice, maxPrice, search } = req.query as Record<string, string | undefined>
  const parsedPage  = parseInt(String(page  ?? 1))
  const parsedLimit = parseInt(String(limit ?? 20))
  const offset = (parsedPage - 1) * parsedLimit

  const wheres: string[] = ["l.status = 'active'"]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = []
  let p = 1

  if (category)   { wheres.push(`l.category   = $${p}::listing_category`); params.push(category);   p++ }
  if (venueStyle) { wheres.push(`l.venue_style = $${p}::venue_style`);      params.push(venueStyle); p++ }
  if (condition)  { wheres.push(`l.condition  = $${p}::listing_condition`); params.push(condition);  p++ }
  if (minPrice)   { wheres.push(`l.price >= $${p}`);                        params.push(minPrice);   p++ }
  if (maxPrice)   { wheres.push(`l.price <= $${p}`);                        params.push(maxPrice);   p++ }
  if (search)     { wheres.push(`l.title ILIKE $${p}`);                     params.push(`%${search}%`); p++ }

  const where     = wheres.join(' AND ')
  const limitIdx  = p
  const offsetIdx = p + 1

  try {
    const [countResult, feedResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM listings l WHERE ${where}`, params),
      pool.query(
        `${LISTING_SELECT}
         WHERE ${where}
         GROUP BY l.id, u.id
         ORDER BY l.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, parsedLimit, offset],
      ),
    ])

    const total = parseInt(countResult.rows[0].count)
    res.json({
      success: true,
      data: {
        items:   feedResult.rows.map(formatRow),
        total,
        page:    parsedPage,
        limit:   parsedLimit,
        hasMore: offset + feedResult.rows.length < total,
      },
    })
  } catch (err) {
    console.error('Feed error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch listings' } })
  }
})

// ── GET /listings/:id ─────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const listing = await fetchListing(req.params.id)
    if (!listing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } })
      return
    }
    res.json({ success: true, data: listing })
  } catch (err) {
    console.error('Get listing error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch listing' } })
  }
})

// ── PATCH /listings/:id ───────────────────────────────────────────────────────

router.patch('/:id', authenticate, validate(updateListingSchema), async (req: Request, res: Response) => {
  try {
    const existing = await pool.query('SELECT seller_id FROM listings WHERE id = $1', [req.params.id])
    if (!existing.rowCount) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } })
      return
    }
    if (existing.rows[0].seller_id !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your listing' } })
      return
    }

    const { title, description, price, originalRetailPrice, condition, category, venueStyle, imageUrls, status } = req.body
    const sets: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = []
    let p = 1

    if (title               !== undefined) { sets.push(`title = $${p}`);                              params.push(title);               p++ }
    if (description         !== undefined) { sets.push(`description = $${p}`);                        params.push(description);         p++ }
    if (price               !== undefined) { sets.push(`price = $${p}`);                              params.push(price);               p++ }
    if (originalRetailPrice !== undefined) { sets.push(`original_retail_price = $${p}`);              params.push(originalRetailPrice); p++ }
    if (condition           !== undefined) { sets.push(`condition = $${p}::listing_condition`);       params.push(condition);           p++ }
    if (category            !== undefined) { sets.push(`category = $${p}::listing_category`);        params.push(category);            p++ }
    if (venueStyle          !== undefined) { sets.push(`venue_style = $${p}::venue_style`);          params.push(venueStyle);          p++ }
    if (status              !== undefined) { sets.push(`status = $${p}::listing_status`);            params.push(status);              p++ }

    if (sets.length === 0 && imageUrls === undefined) {
      res.status(400).json({ success: false, error: { code: 'NOTHING_TO_UPDATE', message: 'No fields to update' } })
      return
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      if (sets.length > 0) {
        await client.query(
          `UPDATE listings SET ${sets.join(', ')} WHERE id = $${p}`,
          [...params, req.params.id],
        )
      }

      if (imageUrls !== undefined) {
        await client.query('DELETE FROM listing_images WHERE listing_id = $1', [req.params.id])
        for (let i = 0; i < imageUrls.length; i++) {
          await client.query(
            'INSERT INTO listing_images (listing_id, image_url, display_order) VALUES ($1, $2, $3)',
            [req.params.id, imageUrls[i], i],
          )
        }
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    const listing = await fetchListing(req.params.id)
    res.json({ success: true, data: listing })
  } catch (err) {
    console.error('Update listing error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update listing' } })
  }
})

// ── DELETE /listings/:id ──────────────────────────────────────────────────────

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const existing = await pool.query('SELECT seller_id FROM listings WHERE id = $1', [req.params.id])
    if (!existing.rowCount) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } })
      return
    }
    if (existing.rows[0].seller_id !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your listing' } })
      return
    }

    await pool.query("UPDATE listings SET status = 'inactive' WHERE id = $1", [req.params.id])
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('Delete listing error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete listing' } })
  }
})

export default router
