import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pool from '../db/client'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'

const router = Router()

const myOrdersQuerySchema = z.object({
  role:  z.enum(['buyer', 'seller']).optional(),
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ── SQL helpers ───────────────────────────────────────────────────────────────

const ORDER_SELECT = `
  SELECT
    ord.id,
    ord.listing_id,
    ord.offer_id,
    ord.buyer_id,
    ord.seller_id,
    ord.agreed_price,
    ord.status,
    ord.buyer_confirmed,
    ord.seller_confirmed,
    ord.created_at,
    ord.updated_at,
    l.title        AS listing_title,
    COALESCE(
      (SELECT json_build_object('id', li.id, 'listingId', li.listing_id, 'imageUrl', li.image_url, 'displayOrder', li.display_order, 'createdAt', li.created_at)
       FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.display_order LIMIT 1),
      NULL
    )              AS listing_first_image,
    bu.username    AS buyer_username,
    bu.name        AS buyer_name,
    su.username    AS seller_username,
    su.name        AS seller_name
  FROM orders ord
  JOIN listings l  ON l.id  = ord.listing_id
  JOIN users    bu ON bu.id = ord.buyer_id
  JOIN users    su ON su.id = ord.seller_id
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatOrder(row: Record<string, any>) {
  return {
    id:              row.id,
    listingId:       row.listing_id,
    offerId:         row.offer_id,
    buyerId:         row.buyer_id,
    sellerId:        row.seller_id,
    agreedPrice:     parseFloat(row.agreed_price),
    status:          row.status,
    buyerConfirmed:  row.buyer_confirmed,
    sellerConfirmed: row.seller_confirmed,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
    listing: {
      id:     row.listing_id,
      title:  row.listing_title,
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

// ── GET /orders/my ────────────────────────────────────────────────────────────

router.get('/my', authenticate, validate(myOrdersQuerySchema, 'query'), async (req: Request, res: Response) => {
  const { role, page, limit } = req.query as { role?: string; page: string; limit: string }
  const parsedPage  = parseInt(String(page))
  const parsedLimit = parseInt(String(limit))
  const offset      = (parsedPage - 1) * parsedLimit
  const userId      = req.user!.id

  const col = (role ?? 'buyer') === 'seller' ? 'ord.seller_id' : 'ord.buyer_id'

  try {
    const [countResult, rowsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM orders ord WHERE ${col} = $1`, [userId]),
      pool.query(
        `${ORDER_SELECT} WHERE ${col} = $1 ORDER BY ord.created_at DESC LIMIT $2 OFFSET $3`,
        [userId, parsedLimit, offset],
      ),
    ])
    const total = parseInt(countResult.rows[0].count)
    res.json({
      success: true,
      data: {
        items:   rowsResult.rows.map(formatOrder),
        total,
        page:    parsedPage,
        limit:   parsedLimit,
        hasMore: offset + rowsResult.rows.length < total,
      },
    })
  } catch (err) {
    console.error('My orders error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch orders' } })
  }
})

// ── GET /orders/:id ───────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`${ORDER_SELECT} WHERE ord.id = $1`, [req.params.id])
    if (!result.rowCount) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } })
      return
    }
    const order = formatOrder(result.rows[0])
    if (order.buyerId !== req.user!.id && order.sellerId !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your order' } })
      return
    }
    res.json({ success: true, data: order })
  } catch (err) {
    console.error('Get order error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch order' } })
  }
})

// ── PATCH /orders/:id/confirm ─────────────────────────────────────────────────

router.patch('/:id/confirm', authenticate, async (req: Request, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      'SELECT id, buyer_id, seller_id, status, buyer_confirmed, seller_confirmed, listing_id FROM orders WHERE id = $1 FOR UPDATE',
      [req.params.id],
    )
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } })
      return
    }
    const order = result.rows[0]

    const isBuyer  = order.buyer_id  === req.user!.id
    const isSeller = order.seller_id === req.user!.id
    if (!isBuyer && !isSeller) {
      await client.query('ROLLBACK')
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your order' } })
      return
    }
    if (order.status !== 'pending') {
      await client.query('ROLLBACK')
      res.status(409).json({ success: false, error: { code: 'INVALID_STATE', message: 'Order is not pending' } })
      return
    }
    if (isBuyer && order.buyer_confirmed) {
      await client.query('ROLLBACK')
      res.status(409).json({ success: false, error: { code: 'ALREADY_CONFIRMED', message: 'You already confirmed this order' } })
      return
    }
    if (isSeller && order.seller_confirmed) {
      await client.query('ROLLBACK')
      res.status(409).json({ success: false, error: { code: 'ALREADY_CONFIRMED', message: 'You already confirmed this order' } })
      return
    }

    const confirmCol = isBuyer ? 'buyer_confirmed' : 'seller_confirmed'
    await client.query(`UPDATE orders SET ${confirmCol} = TRUE WHERE id = $1`, [order.id])

    const willComplete = isBuyer
      ? order.seller_confirmed
      : order.buyer_confirmed

    if (willComplete) {
      await client.query("UPDATE orders SET status = 'completed' WHERE id = $1", [order.id])
      await client.query("UPDATE listings SET status = 'sold' WHERE id = $1", [order.listing_id])
    }

    await client.query('COMMIT')

    const updated = await pool.query(`${ORDER_SELECT} WHERE ord.id = $1`, [order.id])
    res.json({ success: true, data: formatOrder(updated.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Confirm order error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to confirm order' } })
  } finally {
    client.release()
  }
})

// ── PATCH /orders/:id/cancel ──────────────────────────────────────────────────

router.patch('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      'SELECT id, buyer_id, seller_id, status, listing_id, offer_id FROM orders WHERE id = $1 FOR UPDATE',
      [req.params.id],
    )
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } })
      return
    }
    const order = result.rows[0]

    if (order.buyer_id !== req.user!.id && order.seller_id !== req.user!.id) {
      await client.query('ROLLBACK')
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your order' } })
      return
    }
    if (order.status !== 'pending') {
      await client.query('ROLLBACK')
      res.status(409).json({ success: false, error: { code: 'INVALID_STATE', message: 'Order is not pending' } })
      return
    }

    await client.query("UPDATE orders   SET status = 'cancelled' WHERE id = $1",  [order.id])
    await client.query("UPDATE listings SET status = 'active'    WHERE id = $1",  [order.listing_id])
    await client.query("UPDATE offers   SET status = 'cancelled' WHERE id = $1",  [order.offer_id])

    await client.query('COMMIT')

    const updated = await pool.query(`${ORDER_SELECT} WHERE ord.id = $1`, [order.id])
    res.json({ success: true, data: formatOrder(updated.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Cancel order error:', err)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to cancel order' } })
  } finally {
    client.release()
  }
})

export default router
