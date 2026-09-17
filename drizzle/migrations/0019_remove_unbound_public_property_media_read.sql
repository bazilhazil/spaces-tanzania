-- Listing photos are now served through short-lived signed URLs minted by the
-- server after it verifies the file belongs to a publicly visible listing.
-- The broad storage read rule is therefore no longer needed.
DROP POLICY IF EXISTS "Public reads live property media" ON storage.objects;