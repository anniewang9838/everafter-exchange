-- Mock listings for development.
-- Run: psql "postgresql://postgres@localhost:5432/everafter_dev" -f apps/api/src/db/seeds/001_mock_listings.sql
--
-- To use your own photos: place images in apps/web/public/images/listings/
-- and reference them as http://localhost:3000/images/listings/your-file.jpg

DO $$
DECLARE
  seller UUID;
  lid    UUID;
BEGIN
  SELECT id INTO seller FROM users LIMIT 1;
  IF seller IS NULL THEN
    RAISE NOTICE 'No users found — skipping seed.';
    RETURN;
  END IF;

  -- Remove any previously seeded mock listings
  DELETE FROM listings
  WHERE id IN (
    SELECT DISTINCT listing_id FROM listing_images
    WHERE image_url LIKE '%picsum.photos%' OR image_url LIKE '%unsplash.com%'
  );

  -- 1. Rose Gold Mercury Glass Centerpieces
  INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
  VALUES (seller,
    'Rose Gold Mercury Glass Centerpieces (Set of 12)',
    'Stunning set of 12 rose gold mercury glass vases in varying heights (6"–14"). Perfect for a modern glam wedding. Comes with floral foam inserts. Used once, smoke-free home.',
    180.00, 350.00, 'like_new', 'centerpieces', 'modern')
  RETURNING id INTO lid;
  INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (lid, 'https://images.unsplash.com/photo-1505744288177-8a097ba01de0?w=600&h=450&fit=crop&auto=format', 0),
    (lid, 'https://images.unsplash.com/photo-1556662257-a99f482826b7?w=600&h=450&fit=crop&auto=format', 1);

  -- 2. Dried Pampas Grass & Eucalyptus Table Runners
  INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
  VALUES (seller,
    'Dried Pampas Grass & Eucalyptus Table Runners (Set of 6)',
    'Boho-style table runners made with dried pampas grass, eucalyptus, and white dried florals. Each runner ~5 ft long. Used once at our October wedding. Set of 6.',
    85.00, 180.00, 'like_new', 'table_runners', 'boho')
  RETURNING id INTO lid;
  INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (lid, 'https://images.unsplash.com/photo-1756767236316-1e8196a67fd2?w=600&h=450&fit=crop&auto=format', 0);

  -- 3. Large Macramé Wedding Arch
  INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
  VALUES (seller,
    'Large Macramé Wedding Arch — 7ft Wide',
    'Handmade macramé arch, 7 ft wide × 8 ft tall, natural cotton rope. Slight wear on base from transport but knot work is pristine. Disassembles for easy pickup.',
    320.00, 550.00, 'excellent', 'arch_arbor', 'boho')
  RETURNING id INTO lid;
  INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (lid, 'https://images.unsplash.com/photo-1715000103283-01ed4755483e?w=600&h=450&fit=crop&auto=format', 0),
    (lid, 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=600&h=450&fit=crop&auto=format', 1);

  -- 4. Ivory Pillar Candles
  INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
  VALUES (seller,
    'Ivory Pillar Candles 3"×6" (Set of 48)',
    'Unscented ivory pillar candles, 3" diameter × 6" tall. 42 are unlit; 6 were lit briefly for photos only. Great for table settings or altar decor.',
    55.00, 120.00, 'like_new', 'candles', 'vintage')
  RETURNING id INTO lid;
  INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (lid, 'https://images.unsplash.com/photo-1601479604588-68d9e6d386b5?w=600&h=450&fit=crop&auto=format', 0),
    (lid, 'https://images.unsplash.com/photo-1507486990559-1d65aaad9ba6?w=600&h=450&fit=crop&auto=format', 1);

  -- 5. Acrylic Wedding Seating Chart
  INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
  VALUES (seller,
    'Acrylic Wedding Seating Chart 36"×24" + Stand',
    'Custom acrylic seating chart, black ink with gold accents. 36×24 inches. Includes stand. Modern minimalist design. Names can be covered with stickers for resale.',
    110.00, 250.00, 'excellent', 'signage', 'modern')
  RETURNING id INTO lid;
  INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (lid, 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=600&h=450&fit=crop&auto=format', 0),
    (lid, 'https://images.unsplash.com/photo-1520182062070-2e037a6fbbba?w=600&h=450&fit=crop&auto=format', 1);

  -- 6. Blush Dupioni Silk Table Runners
  INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
  VALUES (seller,
    'Blush Dupioni Silk Table Runners 12"×108" (Set of 10)',
    'Blush/light pink dupioni silk table runners. Dry-cleaned after the wedding. Minimal fraying on 2; other 8 are pristine. Perfect for garden party or ballroom.',
    65.00, 150.00, 'good', 'table_runners', 'garden')
  RETURNING id INTO lid;
  INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (lid, 'https://images.unsplash.com/photo-1710587385302-38ad6020c83d?w=600&h=450&fit=crop&auto=format', 0);

  -- 7. Edison Globe String Lights
  INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
  VALUES (seller,
    'Vintage Edison Globe String Lights — 100ft',
    '100 ft of warm Edison string lights, 30 bulbs, all working. Includes 2 extension cords. Perfect for outdoor reception or barn venue.',
    40.00, 90.00, 'good', 'lighting', 'rustic')
  RETURNING id INTO lid;
  INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (lid, 'https://images.unsplash.com/photo-1760172551421-3007be1060df?w=600&h=450&fit=crop&auto=format', 0),
    (lid, 'https://images.unsplash.com/photo-1462041866295-e4af004a32ef?w=600&h=450&fit=crop&auto=format', 1);

  -- 8. Faux Eucalyptus Garland
  INSERT INTO listings (seller_id, title, description, price, original_retail_price, condition, category, venue_style)
  VALUES (seller,
    'Faux Eucalyptus & Ivy Garland (Set of 8 × 6ft)',
    'High-quality faux eucalyptus and ivy garland, 8 pieces × 6 ft each. Realistic greenery, easy to shape. Drapes beautifully over tables, railings, or arches. Storage boxes included.',
    60.00, 130.00, 'excellent', 'floral', 'garden')
  RETURNING id INTO lid;
  INSERT INTO listing_images (listing_id, image_url, display_order) VALUES
    (lid, 'https://images.unsplash.com/photo-1773005695269-a6d225bfb901?w=600&h=450&fit=crop&auto=format', 0),
    (lid, 'https://images.unsplash.com/photo-1770150138358-5b8db4066e03?w=600&h=450&fit=crop&auto=format', 1);

  RAISE NOTICE 'Seeded 8 mock listings with wedding-specific photos.';
END $$;
