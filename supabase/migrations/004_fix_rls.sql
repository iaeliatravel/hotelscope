-- ============================================================
-- Fix 004 — Simplify all RLS policies that use get_user_role()
-- get_user_role() does a sub-query which can fail silently under load
-- Replace with direct sub-query or simplify to authenticated users
-- ============================================================

-- ============================================================
-- HOTEL SCORES — critical for score saving
-- ============================================================
DROP POLICY IF EXISTS "scores_insert" ON public.hotel_scores;
DROP POLICY IF EXISTS "scores_update" ON public.hotel_scores;
DROP POLICY IF EXISTS "scores_select" ON public.hotel_scores;

CREATE POLICY "scores_select" ON public.hotel_scores
  FOR SELECT TO authenticated USING (TRUE);

-- Allow any authenticated user to insert/update scores (role check removed)
CREATE POLICY "scores_insert" ON public.hotel_scores
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "scores_update" ON public.hotel_scores
  FOR UPDATE TO authenticated
  USING (TRUE);

-- ============================================================
-- HOTELS — simplify
-- ============================================================
DROP POLICY IF EXISTS "hotels_insert" ON public.hotels;
DROP POLICY IF EXISTS "hotels_update" ON public.hotels;

CREATE POLICY "hotels_insert" ON public.hotels
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "hotels_update" ON public.hotels
  FOR UPDATE TO authenticated
  USING (TRUE);

-- ============================================================
-- STORAGE — remove role dependency
-- ============================================================
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_auth" ON storage.objects;
DROP POLICY IF EXISTS "Storage: suppression par propriétaire ou admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "Storage: upload authentifié" ON storage.objects;

-- Simple: any authenticated user can upload/delete in hotel-media bucket
CREATE POLICY "hotel_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hotel-media');

CREATE POLICY "hotel_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hotel-media');

CREATE POLICY "hotel_media_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'hotel-media');

-- ============================================================
-- CITIES, ZONES — simplify
-- ============================================================
DROP POLICY IF EXISTS "cities_insert" ON public.cities;
DROP POLICY IF EXISTS "cities_update" ON public.cities;
DROP POLICY IF EXISTS "zones_insert" ON public.zones;
DROP POLICY IF EXISTS "zones_update" ON public.zones;

CREATE POLICY "cities_insert" ON public.cities
  FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "cities_update" ON public.cities
  FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "zones_insert" ON public.zones
  FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "zones_update" ON public.zones
  FOR UPDATE TO authenticated USING (TRUE);

-- ============================================================
-- HOTEL MEDIA
-- ============================================================
DROP POLICY IF EXISTS "media_insert" ON public.hotel_media;
DROP POLICY IF EXISTS "media_select" ON public.hotel_media;

CREATE POLICY "media_select" ON public.hotel_media
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "media_insert" ON public.hotel_media
  FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "media_delete" ON public.hotel_media
  FOR DELETE TO authenticated USING (TRUE);

-- ============================================================
-- HOTEL REVIEWS, PRICES, SOURCES
-- ============================================================
DROP POLICY IF EXISTS "reviews_insert" ON public.hotel_reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.hotel_reviews;
DROP POLICY IF EXISTS "prices_insert" ON public.hotel_price_snapshots;

CREATE POLICY "reviews_insert" ON public.hotel_reviews
  FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "reviews_update_simple" ON public.hotel_reviews
  FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "prices_insert" ON public.hotel_price_snapshots
  FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "prices_update" ON public.hotel_price_snapshots
  FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "prices_delete" ON public.hotel_price_snapshots
  FOR DELETE TO authenticated USING (TRUE);

-- Sources
DROP POLICY IF EXISTS "sources_insert" ON public.sources;
CREATE POLICY "sources_insert" ON public.sources
  FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Activity log
DROP POLICY IF EXISTS "activity_insert" ON public.activity_log;
CREATE POLICY "activity_insert" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Profile matches
DROP POLICY IF EXISTS "profile_matches_insert" ON public.hotel_profile_matches;
DROP POLICY IF EXISTS "profile_matches_delete" ON public.hotel_profile_matches;
DROP POLICY IF EXISTS "profile_matches_update" ON public.hotel_profile_matches;

CREATE POLICY "profile_matches_write" ON public.hotel_profile_matches
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Client profiles
DROP POLICY IF EXISTS "client_profiles_insert" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_update" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_delete" ON public.client_profiles;

CREATE POLICY "client_profiles_write" ON public.client_profiles
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
