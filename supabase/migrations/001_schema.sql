-- ============================================================
-- HotelScope — Migration principale
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- PROFILES (extension de auth.users)
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

-- Trigger pour créer le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  stars INT GENERATED ALWAYS AS (
    CASE WHEN category IN ('1','2','3','4','5') THEN category::INT ELSE NULL END
  ) STORED,
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
CREATE INDEX idx_hotels_search ON public.hotels USING GIN(to_tsvector('french', name));

CREATE TRIGGER hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HOTEL SCORES
-- ============================================================
CREATE TABLE public.hotel_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL UNIQUE REFERENCES public.hotels(id) ON DELETE CASCADE,
  location_score NUMERIC(4,2) DEFAULT 0 CHECK (location_score BETWEEN 0 AND 10),
  beach_score NUMERIC(4,2) DEFAULT 0 CHECK (beach_score BETWEEN 0 AND 10),
  food_score NUMERIC(4,2) DEFAULT 0 CHECK (food_score BETWEEN 0 AND 10),
  rooms_score NUMERIC(4,2) DEFAULT 0 CHECK (rooms_score BETWEEN 0 AND 10),
  animation_score NUMERIC(4,2) DEFAULT 0 CHECK (animation_score BETWEEN 0 AND 10),
  cleanliness_score NUMERIC(4,2) DEFAULT 0 CHECK (cleanliness_score BETWEEN 0 AND 10),
  value_score NUMERIC(4,2) DEFAULT 0 CHECK (value_score BETWEEN 0 AND 10),
  commercial_score NUMERIC(4,2) DEFAULT 0 CHECK (commercial_score BETWEEN 0 AND 10),
  reliability_score NUMERIC(4,2) DEFAULT 0 CHECK (reliability_score BETWEEN 0 AND 10),
  average_score NUMERIC(4,2) DEFAULT 0,
  final_score NUMERIC(4,2) DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hotel_scores_hotel ON public.hotel_scores(hotel_id);

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
CREATE INDEX idx_prices_season ON public.hotel_price_snapshots(season);

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
CREATE INDEX idx_offers_city ON public.offer_requests(city_id);

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

CREATE INDEX idx_activity_user ON public.activity_log(user_id);
CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_entity ON public.activity_log(entity_type, entity_id);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-media',
  'hotel-media',
  TRUE,
  10485760, -- 10MB
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

-- Helper function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "Profiles: lecture pour utilisateurs connectés"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Profiles: modification par le propriétaire"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- CITIES policies
CREATE POLICY "Cities: lecture pour tous connectés"
  ON public.cities FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Cities: écriture admin/agent"
  ON public.cities FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "Cities: modification admin/agent"
  ON public.cities FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- ZONES policies
CREATE POLICY "Zones: lecture pour tous connectés"
  ON public.zones FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Zones: écriture admin/agent"
  ON public.zones FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "Zones: modification admin/agent"
  ON public.zones FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- HOTELS policies
CREATE POLICY "Hotels: lecture pour tous connectés"
  ON public.hotels FOR SELECT TO authenticated USING (is_deleted = FALSE);

CREATE POLICY "Hotels: création admin/agent"
  ON public.hotels FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "Hotels: modification admin/agent"
  ON public.hotels FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- HOTEL_SCORES policies
CREATE POLICY "Scores: lecture pour tous"
  ON public.hotel_scores FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Scores: création admin/agent"
  ON public.hotel_scores FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "Scores: modification admin/agent"
  ON public.hotel_scores FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- HOTEL_REVIEWS policies
CREATE POLICY "Reviews: lecture pour tous"
  ON public.hotel_reviews FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Reviews: création admin/agent"
  ON public.hotel_reviews FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "Reviews: modification par auteur ou admin"
  ON public.hotel_reviews FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role() = 'admin');

-- PRICE_SNAPSHOTS policies
CREATE POLICY "Prices: lecture pour tous"
  ON public.hotel_price_snapshots FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Prices: création admin/agent"
  ON public.hotel_price_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

-- CLIENT_PROFILES policies
CREATE POLICY "Client profiles: lecture pour tous"
  ON public.client_profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Client profiles: gestion admin"
  ON public.client_profiles FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin');

-- HOTEL_PROFILE_MATCHES policies
CREATE POLICY "Profile matches: lecture pour tous"
  ON public.hotel_profile_matches FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Profile matches: écriture admin/agent"
  ON public.hotel_profile_matches FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

CREATE POLICY "Profile matches: suppression admin/agent"
  ON public.hotel_profile_matches FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin', 'agent'));

-- HOTEL_MEDIA policies
CREATE POLICY "Media: lecture pour tous"
  ON public.hotel_media FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Media: upload admin/agent"
  ON public.hotel_media FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

-- SOURCES policies
CREATE POLICY "Sources: lecture pour tous"
  ON public.sources FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Sources: écriture admin/agent"
  ON public.sources FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

-- OFFER_REQUESTS policies
CREATE POLICY "Offers: lecture par auteur"
  ON public.offer_requests FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "Offers: création par tous connectés"
  ON public.offer_requests FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Offers: modification par auteur"
  ON public.offer_requests FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.get_user_role() = 'admin');

-- OFFER_RECOMMENDATIONS policies
CREATE POLICY "Recommendations: lecture par tous"
  ON public.offer_recommendations FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Recommendations: écriture admin/agent"
  ON public.offer_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'agent'));

-- ACTIVITY_LOG policies
CREATE POLICY "Activity: lecture pour tous connectés"
  ON public.activity_log FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Activity: insertion par utilisateurs connectés"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Storage policies
CREATE POLICY "Storage: lecture publique"
  ON storage.objects FOR SELECT USING (bucket_id = 'hotel-media');

CREATE POLICY "Storage: upload authentifié"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hotel-media');

CREATE POLICY "Storage: suppression par propriétaire ou admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hotel-media'
  AND (
    owner_id = auth.uid()::text
    OR public.get_user_role() = 'admin'
  )
);