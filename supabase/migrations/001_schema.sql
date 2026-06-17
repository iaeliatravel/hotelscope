-- ============================================================
-- HotelScope — Migration principale
-- Compatible Supabase (toutes versions récentes)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'readonly')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'agent'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- CITIES
-- ============================================================
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Maroc',
  description TEXT,
  cover_image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cities_active ON public.cities(is_active);

CREATE TRIGGER cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ZONES
-- ============================================================
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  characteristics TEXT,
  distance_center TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zones_city ON public.zones(city_id);
CREATE INDEX idx_zones_active ON public.zones(is_active);

CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HOTELS
-- ============================================================
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES public.cities(id),
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '4' CHECK (category IN ('1','2','3','4','5','apart','riad','resort')),
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif','en_veille','non_recommande','a_verifier')),
  address TEXT,
  landmark TEXT,
  beach_distance TEXT,
  beach_type TEXT CHECK (beach_type IN ('sable_fin','sable_grossier','galets','rochers','lagon','piscine_privee')),
  ambiance TEXT CHECK (ambiance IN ('familial','romantique','festif','calme','sportif','luxe','backpacker')),
  target_audience TEXT,
  board_types TEXT[] DEFAULT '{}',
  animation_level TEXT,
  room_quality TEXT,
  food_quality TEXT,
  pool_quality TEXT,
  beach_quality TEXT,
  value_for_money TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  commercial_summary TEXT,
  internal_notes TEXT,
  cover_image TEXT,
  website_url TEXT,
  booking_url TEXT,
  global_score NUMERIC(4,2) CHECK (global_score BETWEEN 0 AND 10),
  last_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_reviewed_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hotels_city ON public.hotels(city_id);
CREATE INDEX idx_hotels_zone ON public.hotels(zone_id);
CREATE INDEX idx_hotels_status ON public.hotels(status);
CREATE INDEX idx_hotels_deleted ON public.hotels(is_deleted);
CREATE INDEX idx_hotels_score ON public.hotels(global_score DESC NULLS LAST);

CREATE TRIGGER hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HOTEL SCORES
-- ============================================================
CREATE TABLE public.hotel_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL UNIQUE REFERENCES public.hotels(id) ON DELETE CASCADE,
  location_score NUMERIC(4,2) DEFAULT 0,
  beach_score NUMERIC(4,2) DEFAULT 0,
  food_score NUMERIC(4,2) DEFAULT 0,
  rooms_score NUMERIC(4,2) DEFAULT 0,
  animation_score NUMERIC(4,2) DEFAULT 0,
  cleanliness_score NUMERIC(4,2) DEFAULT 0,
  value_score NUMERIC(4,2) DEFAULT 0,
  commercial_score NUMERIC(4,2) DEFAULT 0,
  reliability_score NUMERIC(4,2) DEFAULT 0,
  average_score NUMERIC(4,2) DEFAULT 0,
  final_score NUMERIC(4,2) DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER hotel_scores_updated_at
  BEFORE UPDATE ON public.hotel_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HOTEL REVIEWS
-- ============================================================
CREATE TABLE public.hotel_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source TEXT,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  positive_trends TEXT,
  negative_trends TEXT,
  recurring_remarks TEXT,
  watch_points TEXT,
  short_conclusion TEXT,
  raw_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_hotel ON public.hotel_reviews(hotel_id);
CREATE INDEX idx_reviews_date ON public.hotel_reviews(review_date DESC);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.hotel_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HOTEL PRICE SNAPSHOTS
-- ============================================================
CREATE TABLE public.hotel_price_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE,
  period_end DATE,
  season TEXT CHECK (season IN ('basse','moyenne','haute','tres_haute')),
  room_type TEXT,
  board_type TEXT CHECK (board_type IN ('sans','logement','pd','demi','complet','all_inclusive','ultra_all')),
  adults INT NOT NULL DEFAULT 2,
  children INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR','USD','MAD','TND','DZD')),
  price NUMERIC(10,2) NOT NULL,
  price_per_person NUMERIC(10,2),
  source_platform TEXT,
  source_url TEXT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'valide' CHECK (status IN ('valide','a_confirmer','expire','indicatif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prices_hotel ON public.hotel_price_snapshots(hotel_id);
CREATE INDEX idx_prices_date ON public.hotel_price_snapshots(observation_date DESC);

-- ============================================================
-- CLIENT PROFILES
-- ============================================================
CREATE TABLE public.client_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HOTEL PROFILE MATCHES
-- ============================================================
CREATE TABLE public.hotel_profile_matches (
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  match_level TEXT NOT NULL DEFAULT 'bon' CHECK (match_level IN ('parfait','bon','possible','deconseille')),
  notes TEXT,
  PRIMARY KEY (hotel_id, profile_id)
);

CREATE INDEX idx_profile_matches_hotel ON public.hotel_profile_matches(hotel_id);
CREATE INDEX idx_profile_matches_profile ON public.hotel_profile_matches(profile_id);

-- ============================================================
-- HOTEL MEDIA
-- ============================================================
CREATE TABLE public.hotel_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image','capture','document','link')),
  url TEXT NOT NULL,
  caption TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_hotel ON public.hotel_media(hotel_id);

-- ============================================================
-- SOURCES
-- ============================================================
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  type TEXT NOT NULL DEFAULT 'autre' CHECK (type IN ('site_officiel','ota','avis','presse','interne','autre')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_hotel ON public.sources(hotel_id);

-- ============================================================
-- OFFER REQUESTS
-- ============================================================
CREATE TABLE public.offer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  check_in DATE,
  check_out DATE,
  adults INT NOT NULL DEFAULT 2,
  children INT NOT NULL DEFAULT 0,
  budget_min NUMERIC(10,2),
  budget_max NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  profile_ids UUID[],
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','envoye','accepte','refuse','expire')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offers_author ON public.offer_requests(author_id);

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON public.offer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- OFFER RECOMMENDATIONS
-- ============================================================
CREATE TABLE public.offer_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES public.offer_requests(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  rank INT NOT NULL DEFAULT 1,
  commercial_summary TEXT,
  strengths_highlight TEXT,
  weaknesses_mention TEXT,
  estimated_price NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  final_recommendation TEXT
);

CREATE INDEX idx_recommendations_offer ON public.offer_recommendations(offer_id);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-media',
  'hotel-media',
  TRUE,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_profile_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: rôle de l'utilisateur courant
-- Retourne TEXT, comparé uniquement à des TEXT dans les policies
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'readonly');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES — PROFILES
-- ============================================================
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- POLICIES — CITIES
-- ============================================================
CREATE POLICY "cities_select" ON public.cities
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "cities_insert" ON public.cities
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "cities_update" ON public.cities
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — ZONES
-- ============================================================
CREATE POLICY "zones_select" ON public.zones
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "zones_insert" ON public.zones
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "zones_update" ON public.zones
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — HOTELS
-- ============================================================
CREATE POLICY "hotels_select" ON public.hotels
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "hotels_insert" ON public.hotels
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "hotels_update" ON public.hotels
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — HOTEL SCORES
-- ============================================================
CREATE POLICY "scores_select" ON public.hotel_scores
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "scores_insert" ON public.hotel_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "scores_update" ON public.hotel_scores
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — HOTEL REVIEWS
-- ============================================================
CREATE POLICY "reviews_select" ON public.hotel_reviews
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "reviews_insert" ON public.hotel_reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "reviews_update" ON public.hotel_reviews
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role() = 'admin');

-- ============================================================
-- POLICIES — PRICE SNAPSHOTS
-- ============================================================
CREATE POLICY "prices_select" ON public.hotel_price_snapshots
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "prices_insert" ON public.hotel_price_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — CLIENT PROFILES
-- ============================================================
CREATE POLICY "client_profiles_select" ON public.client_profiles
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "client_profiles_all" ON public.client_profiles
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- POLICIES — HOTEL PROFILE MATCHES
-- ============================================================
CREATE POLICY "profile_matches_select" ON public.hotel_profile_matches
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "profile_matches_insert" ON public.hotel_profile_matches
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "profile_matches_delete" ON public.hotel_profile_matches
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — HOTEL MEDIA
-- ============================================================
CREATE POLICY "media_select" ON public.hotel_media
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "media_insert" ON public.hotel_media
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — SOURCES
-- ============================================================
CREATE POLICY "sources_select" ON public.sources
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "sources_insert" ON public.sources
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — OFFER REQUESTS
-- ============================================================
CREATE POLICY "offers_select" ON public.offer_requests
  FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "offers_insert" ON public.offer_requests
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "offers_update" ON public.offer_requests
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role() = 'admin');

-- ============================================================
-- POLICIES — OFFER RECOMMENDATIONS
-- ============================================================
CREATE POLICY "recommendations_select" ON public.offer_recommendations
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "recommendations_insert" ON public.offer_recommendations
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

-- ============================================================
-- POLICIES — ACTIVITY LOG
-- ============================================================
CREATE POLICY "activity_select" ON public.activity_log
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "activity_insert" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- STORAGE POLICIES (sans cast uuid/text)
-- ============================================================
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'hotel-media');

CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hotel-media');

CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hotel-media' AND public.get_user_role() IN ('admin', 'agent'));

