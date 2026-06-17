-- ============================================================
-- HotelScope — Données de démonstration
-- ============================================================

-- Compte demo (à créer manuellement dans Supabase Auth)
-- Email : demo@hotelscope.com / Mot de passe : demo123456

-- ============================================================
-- CLIENT PROFILES
-- ============================================================
INSERT INTO public.client_profiles (id, name, label, description, icon, color) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'famille', 'Famille', 'Couples avec enfants, recherchent sécurité et activités pour tous', '👨‍👩‍👧', '#3B82F6'),
  ('a1000000-0000-0000-0000-000000000002', 'couple', 'Couple', 'Recherchent intimité, romantisme, calme ou découverte', '❤️', '#EC4899'),
  ('a1000000-0000-0000-0000-000000000003', 'petit_budget', 'Petit budget', 'Budget serré, bon rapport qualité/prix avant tout', '💰', '#10B981'),
  ('a1000000-0000-0000-0000-000000000004', 'luxe', 'Luxe', 'Recherchent le meilleur : service, confort, gastronomie', '✨', '#F59E0B'),
  ('a1000000-0000-0000-0000-000000000005', 'plage_directe', 'Plage directe', 'La plage est leur priorité absolue, accès direct impératif', '🏖️', '#06B6D4'),
  ('a1000000-0000-0000-0000-000000000006', 'animation_forte', 'Animation', 'Veulent de l''animation, soirées, activités, ambiance festive', '🎉', '#8B5CF6'),
  ('a1000000-0000-0000-0000-000000000007', 'calme', 'Calme', 'Fuient l''animation, recherchent repos et tranquillité', '🧘', '#14B8A6'),
  ('a1000000-0000-0000-0000-000000000008', 'adultes', 'Adultes', 'Sans enfants, cherchent une atmosphère adulte et raffinée', '🍷', '#F43F5E'),
  ('a1000000-0000-0000-0000-000000000009', 'groupe', 'Groupe', 'Groupes de 10+ personnes, séminaires, voyages scolaires', '👥', '#6366F1'),
  ('a1000000-0000-0000-0000-000000000010', 'rapport_qualite_prix', 'Bon rapport Q/P', 'Veulent de la qualité sans payer le prix fort', '⚖️', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- CITIES
-- ============================================================
INSERT INTO public.cities (id, name, country, description, is_active) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Agadir', 'Maroc', 'Station balnéaire moderne, plage de 10 km, idéale familles et couples', TRUE),
  ('b1000000-0000-0000-0000-000000000002', 'Marrakech', 'Maroc', 'Ville impériale, culture, riads, désert à proximité', TRUE),
  ('b1000000-0000-0000-0000-000000000003', 'Djerba', 'Tunisie', 'Île méditerranéenne, ambiance orientale, plages calmes', TRUE),
  ('b1000000-0000-0000-0000-000000000004', 'Hammamet', 'Tunisie', 'Station balnéaire historique, animation, plages de sable fin', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ZONES
-- ============================================================
INSERT INTO public.zones (id, city_id, name, description, characteristics, distance_center, is_active) VALUES
  -- Agadir
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Zone hôtelière', 'Zone principale d''hôtels sur le front de mer', 'Hôtels de standing, plage directe, animée', '2 km', TRUE),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Founty', 'Quartier résidentiel calme au nord', 'Calme, villas, moins de bruit', '5 km', TRUE),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'Bensergao', 'Zone en développement, hôtels récents', 'Moderne, moins chère, éloignée de la plage', '7 km', TRUE),
  -- Marrakech
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'Médina', 'Centre historique, riads authentiques', 'Authentique, bruyant, touristique', 'centre', TRUE),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002', 'Palmeraie', 'Oasis de luxe au nord de la ville', 'Luxe, calme, grands espaces, loin du centre', '8 km', TRUE),
  -- Djerba
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000003', 'Zone touristique', 'Zone hôtelière principale', 'Plage directe, tous les services, animée', '5 km', TRUE),
  -- Hammamet
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000004', 'Hammamet Nord', 'Zone nord animée et centrale', 'Proche médina, animée, nombreux hôtels', '1 km', TRUE),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000004', 'Yasmine Hammamet', 'Complexe touristique moderne', 'Grande zone hôtelière, animations nombreuses', '12 km', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- HOTELS
-- ============================================================
INSERT INTO public.hotels (id, city_id, zone_id, name, slug, category, status,
  address, beach_distance, beach_type, ambiance, target_audience,
  board_types, animation_level, room_quality, food_quality, pool_quality, beach_quality,
  value_for_money, strengths, weaknesses, commercial_summary, global_score,
  last_reviewed_at, is_deleted) VALUES

-- === AGADIR ===
(
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'Riu Tikida Beach', 'riu-tikida-beach', '5', 'actif',
  'Plage d''Agadir, Zone hôtelière',
  'directe', 'sable_fin', 'familial', 'Familles, couples, tous âges',
  ARRAY['all_inclusive','ultra_all'],
  'Animation journalière et nocturne, clubs enfants',
  'Chambres spacieuses, bien équipées, récemment rénovées',
  'Buffets copieux et variés, snack en bord de piscine',
  '3 piscines dont 1 enfants, jacuzzi',
  'Plage directe, sable fin, chaises longues gratuites',
  'Excellent rapport qualité/prix pour le niveau 5 étoiles',
  ARRAY['Plage directe de qualité', 'Très bonne animation', 'Personnel attentionné', 'Piscines bien entretenues', 'Buffets généreux'],
  ARRAY['Peut être bruyant en haute saison', 'Prix monte en août'],
  'Le Riu Tikida Beach est une valeur sûre d''Agadir pour les familles et les groupes. Plage directe de sable fin, 3 piscines, animation jour et nuit. Le meilleur rapport qualité/prix en 5 étoiles All Inclusive sur la côte.',
  8.4,
  NOW() - INTERVAL '15 days',
  FALSE
),
(
  'd1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'Sofitel Agadir Royal Bay', 'sofitel-agadir-royal-bay', '5', 'actif',
  'Baie des Palmiers, Zone hôtelière nord',
  'directe', 'sable_fin', 'luxe', 'Couples, adultes, clientèle aisée',
  ARRAY['pd','demi','complet'],
  'Animation discrète, spa, wellness',
  'Chambres et suites haut de gamme, décoration soignée',
  'Gastronomie de haut niveau, restaurant panoramique',
  'Piscine à débordement vue mer, adultes only',
  'Plage privée avec service',
  'Prix premium mais prestations à la hauteur',
  ARRAY['Architecture spectaculaire', 'Service impeccable', 'Spa exceptionnel', 'Plage privée exclusive', 'Vue mer depuis toutes les chambres'],
  ARRAY['Prix élevé', 'Peu adapté aux familles avec jeunes enfants', 'Pas d''animation festive'],
  'L''adresse luxe d''Agadir par excellence. Le Sofitel Royal Bay offre un service 5 étoiles irréprochable avec une plage privée, un spa de référence et une architecture arabo-andalouse remarquable. Pour une clientèle adulte exigeante.',
  9.1,
  NOW() - INTERVAL '5 days',
  FALSE
),
(
  'd1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'Kenzi Europa', 'kenzi-europa', '4', 'actif',
  'Rue Anfa, Founty',
  '200m', 'sable_fin', 'familial', 'Familles, petits budgets, groupes',
  ARRAY['demi','all_inclusive'],
  'Animation bonne, mini-club actif',
  'Chambres fonctionnelles, propres, bien entretenues',
  'Cuisine correcte, buffets honnêtes',
  'Grande piscine centrale, espace enfants',
  'Passerelle vers la plage, bon accès',
  'Très bon rapport qualité/prix',
  ARRAY['Prix compétitif', 'Bien situé', 'Animation de qualité', 'Mini-club apprécié'],
  ARRAY['Décoration vieillissante', 'Chambres moins modernes que la concurrence'],
  'Le Kenzi Europa est la solution idéale pour les familles avec budget modéré à Agadir. Animation dynamique, mini-club actif et plage à 200m. Rapport qualité/prix parmi les meilleurs de la station.',
  7.2,
  NOW() - INTERVAL '30 days',
  FALSE
),

-- === MARRAKECH ===
(
  'd1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000005',
  'Es Saadi Marrakech Resort', 'es-saadi-marrakech', 'resort', 'actif',
  'Rue Ibrahim El Mazini, Hivernage',
  NULL, NULL, 'luxe', 'Couples, adultes, clientèle internationale haut de gamme',
  ARRAY['pd','complet'],
  'Spectacles, casino, gastronomie',
  'Palais historique, suites et villas avec piscine privée',
  'Plusieurs restaurants dont un gastronomique étoilé',
  'Parc aquatique privé, piscines multiples',
  NULL,
  'Prix justifié par le niveau d''exception',
  ARRAY['Cadre historique unique', 'Piscines et jardins exceptionnels', 'Plusieurs restaurants de qualité', 'Spa de renom', 'Casino sur place'],
  ARRAY['Très onéreux', 'Loin des souks à pied', 'Pas de plage bien sûr'],
  'L''Es Saadi est un palais-hôtel d''exception au cœur de Marrakech. Pour les voyageurs qui veulent vivre la grandeur marocaine dans un écrin luxueux : jardins somptueux, spa de classe mondiale, restaurant gastronomique. Une expérience hors du commun.',
  9.3,
  NOW() - INTERVAL '8 days',
  FALSE
),
(
  'd1000000-0000-0000-0000-000000000005',
  'b1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000004',
  'Riad Yasmine', 'riad-yasmine', 'riad', 'actif',
  'Derb Sraghna, Médina',
  NULL, NULL, 'romantique', 'Couples, adultes, voyageurs culturels',
  ARRAY['pd'],
  'Calme, excursions organisées sur demande',
  'Chambres décorées à la marocaine, authentiques et charmantes',
  'Petit-déjeuner marocain traditionnel, dîner sur commande',
  'Petite piscine de riad',
  NULL,
  'Excellent rapport qualité/prix pour le charme et la localisation',
  ARRAY['Charme authentique', 'Localisation médina', 'Accueil chaleureux', 'Décoration soignée', 'Petit-déjeuner excellent'],
  ARRAY['Piscine petite', 'Pas adapté aux familles avec enfants', 'Peu d''espace commun'],
  'Le Riad Yasmine incarne l''authenticité marrakchie dans toute sa splendeur. Situé au cœur de la médina, il offre une expérience intimiste avec une décoration soignée et un accueil personnalisé. Idéal pour les couples en quête de dépaysement culturel.',
  8.7,
  NOW() - INTERVAL '20 days',
  FALSE
),

-- === DJERBA ===
(
  'd1000000-0000-0000-0000-000000000006',
  'b1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000006',
  'Djerba Plaza', 'djerba-plaza', '4', 'actif',
  'Zone touristique Midoun',
  'directe', 'sable_fin', 'familial', 'Familles, couples, groupes',
  ARRAY['all_inclusive'],
  'Animation complète, soirées thématiques, clubs enfants',
  'Chambres modernes, bien équipées',
  'Buffets variés, cuisine tunisienne et internationale',
  '2 piscines extérieures, 1 couverte',
  'Plage directe sable blanc, eaux calmes',
  'Bon rapport qualité/prix pour le All Inclusive',
  ARRAY['Plage directe de qualité', 'Animation dynamique', 'Piscine couverte appréciée hors saison', 'Bonne cuisine tunisienne'],
  ARRAY['Piscines parfois bondées', 'Wi-Fi limité certains bâtiments'],
  'Le Djerba Plaza est une adresse fiable pour les familles qui veulent profiter de la belle plage de Djerba en All Inclusive. Animation rythmée, cuisine généreuse et plage directe sur une mer turquoise et calme.',
  7.8,
  NOW() - INTERVAL '12 days',
  FALSE
),

-- === HAMMAMET ===
(
  'd1000000-0000-0000-0000-000000000007',
  'b1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000008',
  'One Resort Aqua Park', 'one-resort-aqua-park', '4', 'actif',
  'Yasmine Hammamet',
  'directe', 'sable_fin', 'festif', 'Familles, jeunes, groupes festifs',
  ARRAY['ultra_all'],
  'Animation très forte, aqua park, soirées DJ, clubs à thème',
  'Chambres fonctionnelles, rénovées',
  'Ultra All Inclusive, snacks disponibles 24h',
  'Aqua park avec toboggans, piscines à vagues',
  'Grande plage directe',
  'Excellent rapport qualité/prix pour les familles animation',
  ARRAY['Aqua park inclus', 'Animation exceptionnelle', 'Ultra All Inclusive généreux', 'Idéal familles et jeunes'],
  ARRAY['Peut être très bruyant', 'Pas adapté aux couples cherchant le calme', 'Chambres standards sans vue mer'],
  'Le One Resort Aqua Park est LE choix pour les familles qui veulent en avoir plein la vue à Yasmine Hammamet. Aqua park inclus dans l''Ultra All Inclusive, animation explosive, plage directe. Les enfants en rêveront des années.',
  8.0,
  NOW() - INTERVAL '3 days',
  FALSE
),
(
  'd1000000-0000-0000-0000-000000000008',
  'b1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000007',
  'Hasdrubal Prestige', 'hasdrubal-prestige', '5', 'a_verifier',
  'Port El Kantaoui, Hammamet Nord',
  '50m', 'sable_fin', 'romantique', 'Couples, adultes, familles aisées',
  ARRAY['pd','demi'],
  'Animation modérée, spa, activités nautiques',
  'Chambres de luxe récemment rénovées, terrasse ou balcon',
  'Restaurant gastronomique, buffets haut de gamme',
  'Piscines à débordement, espace détente adultes',
  'Accès à une belle plage de sable',
  'Prix élevé mais prestations au rendez-vous',
  ARRAY['Cadre élégant', 'Spa haut de gamme', 'Service personnalisé', 'Vue mer'],
  ARRAY['Prix élevé', 'À vérifier : travaux de rénovation en cours selon retours récents'],
  'Le Hasdrubal Prestige affiche un standing 5 étoiles incontestable mais des retours récents signalent des travaux. À vérifier avant recommandation. Quand il est au top, c''est l''une des meilleures adresses de Hammamet.',
  7.5,
  NOW() - INTERVAL '45 days',
  FALSE
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- HOTEL SCORES
-- ============================================================
INSERT INTO public.hotel_scores (hotel_id, location_score, beach_score, food_score, rooms_score,
  animation_score, cleanliness_score, value_score, commercial_score, reliability_score,
  average_score, final_score) VALUES
  ('d1000000-0000-0000-0000-000000000001', 8.5, 9.0, 8.0, 8.0, 9.0, 8.5, 8.5, 8.5, 8.0, 8.4, 8.4),
  ('d1000000-0000-0000-0000-000000000002', 9.0, 9.5, 9.5, 9.5, 7.0, 9.5, 8.0, 9.5, 9.5, 9.1, 9.1),
  ('d1000000-0000-0000-0000-000000000003', 7.5, 7.5, 7.0, 6.5, 7.5, 7.5, 8.0, 7.0, 7.0, 7.3, 7.2),
  ('d1000000-0000-0000-0000-000000000004', 9.0, 0.0, 9.5, 9.5, 8.5, 9.5, 8.0, 9.5, 9.5, 9.3, 9.3),
  ('d1000000-0000-0000-0000-000000000005', 9.5, 0.0, 8.5, 8.5, 6.0, 9.0, 9.0, 9.0, 8.5, 8.7, 8.7),
  ('d1000000-0000-0000-0000-000000000006', 8.0, 8.5, 7.5, 7.5, 8.5, 8.0, 8.0, 8.0, 7.5, 7.9, 7.8),
  ('d1000000-0000-0000-0000-000000000007', 8.5, 8.5, 7.5, 7.0, 9.5, 7.5, 9.0, 8.5, 8.0, 8.2, 8.0),
  ('d1000000-0000-0000-0000-000000000008', 8.0, 8.0, 8.0, 8.5, 7.0, 8.0, 6.5, 7.5, 6.5, 7.6, 7.5)
ON CONFLICT (hotel_id) DO NOTHING;

-- ============================================================
-- HOTEL PROFILE MATCHES
-- ============================================================
INSERT INTO public.hotel_profile_matches (hotel_id, profile_id, match_level, notes) VALUES
  -- Riu Tikida Beach
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'parfait', 'Clubs enfants, piscine, plage directe'),
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'parfait', 'Plage directe sable fin'),
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'bon', 'Bonne animation'),
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', 'bon', 'AI compétitif'),
  -- Sofitel
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'parfait', 'Le luxe d''Agadir'),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'parfait', 'Romantique, adultes'),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'parfait', 'Clientèle adulte'),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000007', 'bon', 'Calme et raffiné'),
  -- Kenzi Europa
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'bon', 'Bon mini-club'),
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'parfait', 'Meilleur prix Agadir'),
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000010', 'parfait', 'Excellent Q/P'),
  -- Es Saadi
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'parfait', 'Le must de Marrakech'),
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'parfait', 'Romantique de luxe'),
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000008', 'bon', 'Adultes uniquement conseillé'),
  -- Riad Yasmine
  ('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'parfait', 'Romantisme authentique'),
  ('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000007', 'parfait', 'Calme de la médina'),
  ('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000010', 'bon', 'Bon prix/charme'),
  -- Djerba Plaza
  ('d1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 'parfait', 'Très familial'),
  ('d1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000005', 'parfait', 'Plage directe mer calme'),
  ('d1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006', 'bon', 'Bonne animation'),
  -- One Resort
  ('d1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'parfait', 'Aqua park, enfants ravis'),
  ('d1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000006', 'parfait', 'Animation maximale'),
  ('d1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000010', 'parfait', 'UAI généreux'),
  -- Hasdrubal
  ('d1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000004', 'bon', 'À confirmer selon travaux'),
  ('d1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 'bon', 'Romantique si bon état')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE REVIEWS
-- ============================================================
-- Note: author_id sera mis à jour avec l'UUID du compte demo après création

-- ============================================================
-- SAMPLE PRICE SNAPSHOTS
-- ============================================================
-- Note: à insérer après création du compte demo

-- ============================================================
-- SOURCES
-- ============================================================
INSERT INTO public.sources (hotel_id, name, url, type, notes) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Booking.com', 'https://www.booking.com/hotel/ma/riu-tikida-beach.html', 'ota', 'Avis globalement très positifs, 8.5/10'),
  ('d1000000-0000-0000-0000-000000000001', 'Site officiel RIU', 'https://www.riu.com/fr/hotel/maroc/agadir/hotel-riu-tikida-beach/', 'site_officiel', NULL),
  ('d1000000-0000-0000-0000-000000000002', 'Booking.com', 'https://www.booking.com/hotel/ma/sofitel-agadir-royal-bay.html', 'ota', 'Exceptionnel 9.2/10'),
  ('d1000000-0000-0000-0000-000000000002', 'TripAdvisor', 'https://www.tripadvisor.fr/Hotel_Review-d12345-Sofitel_Agadir.html', 'avis', 'N°1 Agadir plusieurs années'),
  ('d1000000-0000-0000-0000-000000000004', 'Site officiel Es Saadi', 'https://www.essaadi.com', 'site_officiel', 'Infos tarifaires à jour'),
  ('d1000000-0000-0000-0000-000000000005', 'Riad Yasmine direct', 'https://www.riadyasmine.com', 'site_officiel', 'Réservation directe possible -10%')
ON CONFLICT DO NOTHING;
