-- ============================================================
-- HotelScope — Migration 003
-- Localisation, médias, réseaux sociaux, AeliaNote, pays, CRUD profils
-- ============================================================

-- ============================================================
-- HOTELS — nouvelles colonnes
-- ============================================================
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS map_static_url TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS aelia_note TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT;

CREATE INDEX IF NOT EXISTS idx_hotels_coords ON public.hotels(latitude, longitude);

-- ============================================================
-- CITIES — ajout du pays comme dimension filtrable
-- (la colonne 'country' existe déjà, on ajoute juste un index)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country);

-- ============================================================
-- HOTEL MEDIA — supporter mieux les liens externes
-- (la table existe déjà avec type image/capture/document/link, on ajoute social)
-- ============================================================
ALTER TABLE public.hotel_media
  DROP CONSTRAINT IF EXISTS hotel_media_type_check;

ALTER TABLE public.hotel_media
  ADD CONSTRAINT hotel_media_type_check
  CHECK (type IN ('image','capture','document','link','social'));

-- ============================================================
-- SUPPRESSION DÉFINITIVE — fonction RPC sécurisée
-- Supprime un hôtel et toutes ses dépendances en cascade
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_hotel_permanently(p_hotel_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Vérifie que l'utilisateur a le droit (admin ou agent)
  IF public.get_user_role() NOT IN ('admin', 'agent') THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  DELETE FROM public.offer_recommendations WHERE hotel_id = p_hotel_id;
  DELETE FROM public.hotel_profile_matches WHERE hotel_id = p_hotel_id;
  DELETE FROM public.hotel_media WHERE hotel_id = p_hotel_id;
  DELETE FROM public.sources WHERE hotel_id = p_hotel_id;
  DELETE FROM public.hotel_price_snapshots WHERE hotel_id = p_hotel_id;
  DELETE FROM public.hotel_reviews WHERE hotel_id = p_hotel_id;
  DELETE FROM public.hotel_scores WHERE hotel_id = p_hotel_id;
  DELETE FROM public.hotels WHERE id = p_hotel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CLIENT_PROFILES — élargir les policies pour permettre
-- la gestion complète par agent (pas seulement admin)
-- ============================================================
DROP POLICY IF EXISTS "client_profiles_all" ON public.client_profiles;

CREATE POLICY "client_profiles_insert" ON public.client_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "client_profiles_update" ON public.client_profiles
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "client_profiles_delete" ON public.client_profiles
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- Permettre la modification de la colonne 'name' (qui était unique avec contrainte stricte)
-- On retire la contrainte d'enum implicite côté front, name devient libre
-- (la colonne est déjà TEXT UNIQUE, donc OK nativement)

-- ============================================================
-- HOTEL_PROFILE_MATCHES — autoriser la mise à jour (UPDATE)
-- ============================================================
DROP POLICY IF EXISTS "profile_matches_update" ON public.hotel_profile_matches;
CREATE POLICY "profile_matches_update" ON public.hotel_profile_matches
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- Vue utilitaire : pays distincts utilisés
-- ============================================================
CREATE OR REPLACE VIEW public.distinct_countries AS
  SELECT DISTINCT country FROM public.cities WHERE is_active = TRUE ORDER BY country;

-- ============================================================
-- AGENCY SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agency_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Aelia Travel',
  slogan TEXT DEFAULT 'Votre agence de voyage de confiance',
  address TEXT DEFAULT 'Algérie',
  phone TEXT DEFAULT '+213 XXX XXX XXX',
  email TEXT DEFAULT 'contact@aeliatravel.com',
  website TEXT DEFAULT 'www.aeliatravel.com',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Seed with defaults (only one row)
INSERT INTO public.agency_settings (id, name, slogan, address, phone, email, website)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Aelia Travel',
  'Votre agence de voyage de confiance',
  'Algérie',
  '+213 XXX XXX XXX',
  'contact@aeliatravel.com',
  'www.aeliatravel.com'
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_settings_select" ON public.agency_settings
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "agency_settings_update" ON public.agency_settings
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "agency_settings_insert" ON public.agency_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE TRIGGER agency_settings_updated_at
  BEFORE UPDATE ON public.agency_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HOTELS — nouvelles colonnes politiques hôtel
-- ============================================================
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS singles_policy TEXT DEFAULT 'non_applique'
    CHECK (singles_policy IN ('familles_couples', 'accepte_celibataires', 'celibataires_demande', 'non_applique')),
  ADD COLUMN IF NOT EXISTS burkini_policy TEXT DEFAULT 'non_applique'
    CHECK (burkini_policy IN ('autorise', 'interdit', 'non_applique'));

-- ============================================================
-- PRICE SNAPSHOTS — restricting currency to DZD, source to known platforms
-- ============================================================
-- We handle this via frontend validation only (no need to alter constraint)
