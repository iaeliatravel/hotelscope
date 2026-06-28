-- ============================================================
-- Fix storage delete policy — remove dependency on get_user_role()
-- which can fail if profiles table is slow
-- ============================================================
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "Storage: suppression par propriétaire ou admin" ON storage.objects;

-- Simple: any authenticated user can delete in the hotel-media bucket
CREATE POLICY "storage_delete_auth" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hotel-media');

-- Also ensure UPDATE is allowed (needed for some Supabase versions)
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_update_auth" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'hotel-media');
