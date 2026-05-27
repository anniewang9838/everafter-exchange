import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pool from '../db/client'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'

const router = Router()

// ── Zod schemas ───────────────────────────────────────────────────────────────

const createOfferSchema = z.object({
  listingId: z.string().uuid(),
  price:     z.number().positive(),
})

const buyNowSchema = z.object({
  listingId: z.string().uuid(),
})

const myOffersQuerySchema = z.object({
  role:  z.enum(['buyer', 'seller']).optional(),
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ── SQL helpers ───────────────────────────────────────────────────────────────

const OFFER_SELECT = `
  SELECT
    o.id,
    o.listing_id,
    o.buyer_id,
    o.seller_id,
    o.price,
    o.status,
    o.created_at,
    o.updated_at,
    l.title        AS listing_title,
    l.price        AS listing_price,
    COALESCE(
      (SELECT json_build_object('id', li.id, 'listingId', li.listing_id, 'imageUrl', li.image_url, 'displayOrder', li.display_order, 'createdAt', li.created_at)
       FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.display_order LIMIT 1),
      NULL
    )              AS listing_first_image,
    bu.username    AS buyer_username,
    bu.name        AS buyer_name,
    su.username    AS seller_username,
    su.name        AS seller_name
  FROM offers o
  JOIN listings l ON l.id = o.listing_id
  JOIN users    bu ON bu.id = o.buyer_id
  JOIN users    su ON su.id = o.seller_id
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatOffer(row: Record<string, any>) {
  return {
    id:        row.id,
    listingId: row.listing_id,
    buyerId:   row.buyer_id,
    sellerId:  row.seller_id,
    price:     parseFloat(row.price),
    status:    row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    listing: {
      id:     row.listing_id,
      title:  row.listing_title,
      price:  parseFloat(row.listing_price),
      images: row.listing_first_image ? [row.listing_first_image] : [],
    },
    buyer: {
      id:       row.buyer_id,
      username: row.buyer_username,
      name:     row.buyer_name,
    },
    seller: {
      id:       row.seller_id,
      username: row.seller_username,
      name:     row.seller_name,
    },
  }
}

async function fetchOffer(id: string) {
  const r = await pool.query(`${OFFER_SELECT} WHERE o.id = $1`, [id])
  return r.rowCount ? formatOffer(r.rows[0]) : null
}

// ── POST /offers ──────────────────────────────────────────────────────────────

router.post('/', authenticate, validate(createOfferSchema), async (req: Request, res: Response) => {
  const { listingId, price } = req.body
  const buyerId = req.user!.id

  try {
    const listingResult = await pool.query(
      'SELECT id, seller_id, status FROM listings WHERE id = $1',
      [listingId],
    )
    if (!listingResult.rowCount) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } })
      return
    }
    const listing = listingResult.rows[0]
    if (listing.status !== 'active') {
      res.status(409).json({ success: false, error: { code: 'LISTING_UNAVAILABLE', message: 'Listing is no longer available' } })
      return
    }
    if (listing.seller_id === buyerId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot make an offer on your own listing' } })
      return
    }

    const dupResult = await pool.query(
      "SELECT id FROM offers WHERE listing_id = $1 AND buyer_id = $2 AND status = 'pending'",
      [listingId, buyerId],
    )
    if (dupResult.rowCount) {
      res.status(409).json({ success: false, error: { code: 'OFFER_EXISTS', message: 'You already have a pending offer on this listing' } })
      return
    }

    const { rows } = await pool.query(
      `INSERT INTO offers (listing_id, buyer_id, seller_id, price)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [listingId, buyerId, listing.seller_id, price],
    )
    const offer = await fetchOffer(rows[0].id)
    res.status(201).json({ success: true, data: offer })
  } catch (err) {
    console.error('Create offer error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create offer' } })
  }
})

// ── POST /offers/buy-now ──────────────────────────────────────────────────────

router.post('/buy-now', authenticate, validate(buyNowSchema), async (req: Request, res: Response) => {
  const { listingId } = req.body
  const buyerId = req.user!.id
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const listingResult = await client.query(
      'SELECT id, seller_id, price, status FROM listings WHERE id = $1 FOR UPDATE',
      [listingId],
    )
    if (!listingResult.rowCount) {
      await client.query('ROLLBACK')
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } })
      return
    }
    const listing = listingResult.rows[0]
    if (listing.status !== 'active') {
      await client.query('ROLLBACK')
      res.status(409).json({ success: false, error: { code: 'LISTING_UNAVAILABLE', message: 'Listing is no longer available' } })
      return
    }
    if (listing.seller_id === buyerId) {
      await client.query('ROLLBACK')
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot buy your own listing' } })
      return
    }

    // Create offer at listing price, immediately accepted
    const offerResult = await client.query(
      `INSERT INTO offers (listing_id, buyer_id, seller_id, price, status)
       VALUES ($1, $2, $3, $4, 'accepted') RETURNING id`,
      [listingId, buyerId, listing.seller_id, listing.price],
    )
    const offerId = offerResult.rows[0].id

    // Reject any other pending offers on this listing
    await client.query(
      "UPDATE offers SET status = 'rejected' WHERE listing_id = $1 AND status = 'pending'",
      [listingId],
    )

    // Set listing to reserved
    await client.query(
      "UPDATE listings SET status = 'reserved' WHERE id = $1",
      [listingId],
    )

    // Create pending order
    const orderResult = await client.query(
      `INSERT INTO orders (listing_id, offer_id, buyer_id, seller_id, agreed_price)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [listingId, offerId, buyerId, listing.seller_id, listing.price],
    )

    await client.query('COMMIT')

    const offer = await fetchOffer(offerId)
    res.status(201).json({ success: true, data: { offer, orderId: orderResult.rows[0].id } })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Buy now error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to complete purchase' } })
  } finally {
    client.release()
  }
})

// ── GET /offers/my ────────────────────────────────────────────────────────────

router.get('/my', authenticate, validate(myOffersQuerySchema, 'query'), async (req: Request, res: Response) => {
  const { role, page, limit } = req.query as { role?: string; page: string; limit: string }
  const parsedPage  = parseInt(String(page))
  const parsedLimit = parseInt(String(limit))
  const offset = (parsedPage - 1) * parsedLimit
  const userId = req.user!.id

  // Default: buyers see sent offers, sellers see received offers
  const effectiveRole = role ?? (['seller', 'both'].includes(req.user!.role) ? 'seller' : 'buyer')
  const col = effectiveRole === 'seller' ? 'o.seller_id' : 'o.buyer_id'

  try {
    const [countResult, rowsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM offers o WHERE ${col} = $1`, [userId]),
      pool.query(
        `${OFFER_SELECT}
         WHERE ${col} = $1
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, parsedLimit, offset],
      ),
    ])
    const total = parseInt(countResult.rows[0].count)
    res.json({
      success: true,
      data: {
        items:   rowsResult.rows.map(formatOffer),
        total,
        page:    parsedPage,
        limit:   parsedLimit,
        hasMore: offset + rowsResult.rows.length < total,
      },
    })
  } catch (err) {
    console.error('My offers error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch offers' } })
  }
})

// ── GET /offers/:id ───────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const offer = await fetchOffer(req.params.id)
    if (!offer) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } })
      return
    }
    if (offer.buyerId !== req.user!.id && offer.sellerId !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your offer' } })
      return
    }
    res.json({ success: true, data: offer })
  } catch (err) {
    console.error('Get offer error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch offer' } })
  }
})

// ── PATCH /offers/:id/accept ──────────────────────────────────────────────────

router.patch('/:id/accept', authenticate, async (req: Request, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const offerResult = await client.query(
      'SELECT id, listing_id, buyer_id, seller_id, price, status FROM offers WHERE id = $1 FOR UPDATE',
      [req.params.id],
    )
    if (!offerResult.rowCount) {
      await client.query('ROLLBACK')
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } })
      return
    }
    const offer = offerResult.rows[0]
    if (offer.seller_id !== req.user!.id) {
      await client.query('ROLLBACK')
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your offer' } })
      return
    }
    if (offer.status !== 'pending') {
      await client.query('ROLLBACK')
      res.status(409).json({ success: false, error: { code: 'INVALID_STATE', message: 'Offer is no longer pending' } })
      return
    }

    // Accept this offer
    await client.query("UPDATE offers SET status = 'accepted' WHERE id = $1", [offer.id])

    // Reject all other pending offers on this listing
    await client.query(
      "UPDATE offers SET status = 'rejected' WHERE listing_id = $1 AND id != $2 AND status = 'pending'",
      [offer.listing_id, offer.id],
    )

    // Reserve the listing
    await client.query(
      "UPDATE listings SET status = 'reserved' WHERE id = $1",
      [offer.listing_id],
    )

    // Create pending order
    const orderResult = await client.query(
      `INSERT INTO orders (listing_id, offer_id, buyer_id, seller_id, agreed_price)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [offer.listing_id, offer.id, offer.buyer_id, offer.seller_id, offer.price],
    )

    await client.query('COMMIT')

    const updated = await fetchOffer(offer.id)
    res.json({ success: true, data: { offer: updated, orderId: orderResult.rows[0].id } })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Accept offer error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to accept offer' } })
  } finally {
    client.release()
  }
})

// ── PATCH /offers/:id/reject ──────────────────────────────────────────────────

router.patch('/:id/reject', authenticate, async (req: Request, res: Response) => {
  try {
    const offerResult = await pool.query(
      'SELECT id, seller_id, status FROM offers WHERE id = $1',
      [req.params.id],
    )
    if (!offerResult.rowCount) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } })
      return
    }
    const offer = offerResult.rows[0]
    if (offer.seller_id !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your offer' } })
      return
    }
    if (offer.status !== 'pending') {
      res.status(409).json({ success: false, error: { code: 'INVALID_STATE', message: 'Offer is no longer pending' } })
      return
    }

    await pool.query("UPDATE offers SET status = 'rejected' WHERE id = $1", [offer.id])
    const updated = await fetchOffer(offer.id)
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('Reject offer error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to reject offer' } })
  }
})

// ── PATCH /offers/:id/cancel ──────────────────────────────────────────────────

router.patch('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const offerResult = await pool.query(
      'SELECT id, buyer_id, status FROM offers WHERE id = $1',
      [req.params.id],
    )
    if (!offerResult.rowCount) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } })
      return
    }
    const offer = offerResult.rows[0]
    if (offer.buyer_id !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your offer' } })
      return
    }
    if (offer.status !== 'pending') {
      res.status(409).json({ success: false, error: { code: 'INVALID_STATE', message: 'Offer is no longer pending' } })
      return
    }

    await pool.query("UPDATE offers SET status = 'cancelled' WHERE id = $1", [offer.id])
    const updated = await fetchOffer(offer.id)
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('Cancel offer error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to cancel offer' } })
  }
})

export default router
