# 🏨 HotelScope

Plateforme de gestion hôtelière pour agences de voyage. Centralisez, évaluez et recommandez les hôtels de vos destinations.

## ✨ Fonctionnalités

- **Fiches hôtels riches** — Notes, qualités, forces/faiblesses, résumé commercial
- **Système de notation** — 9 critères sur 10, score global automatique
- **Synthèses d'avis** — Tendances positives/négatives, points de vigilance
- **Suivi des prix** — Historique, min/max/moyenne par hôtel
- **Profils clients** — 10 profils types, matching automatique
- **Générateur d'offres** — Offre client prête à envoyer en WhatsApp/email
- **Journal d'activité** — Traçabilité complète
- **Villes & Zones** — Hiérarchie géographique complète
- **Auth sécurisée** — Rôles admin/agent/lecture seule, RLS complet

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Compte Supabase (gratuit)
- Compte Vercel (gratuit)

---

### Étape 1 — Cloner et installer

```bash
git clone <votre-repo>
cd hotelscope
npm install
```

---

### Étape 2 — Créer le projet Supabase

1. Allez sur [supabase.com](https://supabase.com) → **New Project**
2. Notez votre **Project URL** et vos clés API (Settings → API)

---

### Étape 3 — Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Editez `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

### Étape 4 — Exécuter les migrations SQL

Dans votre dashboard Supabase → **SQL Editor** :

1. Copiez et exécutez le contenu de `supabase/migrations/001_schema.sql`
2. Copiez et exécutez le contenu de `supabase/migrations/002_seed.sql`

---

### Étape 5 — Créer le compte de démonstration

Dans Supabase → **Authentication → Users → Add user** :
- Email : `demo@hotelscope.com`
- Password : `demo123456`

Puis dans **SQL Editor**, mettez à jour le rôle admin :

```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Demo Admin'
WHERE email = 'demo@hotelscope.com';
```

---

### Étape 6 — Lancer en local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

---

### Étape 7 — Déployer sur Vercel

```bash
npx vercel
```

Ou connectez votre repo GitHub à Vercel et ajoutez les variables d'environnement dans le dashboard Vercel.

---

## 📁 Structure du projet

```
hotelscope/
├── app/
│   ├── (auth)/login/          # Page de connexion
│   └── (dashboard)/
│       ├── layout.tsx          # Layout avec sidebar
│       ├── dashboard/          # Tableau de bord
│       ├── cities/             # Gestion des villes
│       ├── zones/              # Gestion des zones
│       ├── hotels/             # Liste + détail + formulaire
│       ├── reviews/            # Avis et synthèses
│       ├── prices/             # Suivi des prix
│       ├── profiles/           # Profils clients
│       ├── offers/             # Générateur d'offres
│       ├── activity/           # Journal d'activité
│       └── settings/           # Paramètres
├── components/
│   ├── ui/                     # Composants shadcn/ui
│   ├── layout/                 # Sidebar, Header
│   ├── hotels/                 # HotelCard, HotelForm
│   ├── scores/                 # ScoreBadge, ScoreBar
│   └── shared/                 # EmptyState
├── lib/
│   ├── supabase/               # Client browser + server
│   ├── types/                  # Types TypeScript
│   └── utils.ts                # Fonctions utilitaires
└── supabase/
    └── migrations/
        ├── 001_schema.sql      # Schéma complet + RLS
        └── 002_seed.sql        # Données de démonstration
```

---

## 🗄️ Schéma de base de données

| Table | Description |
|-------|-------------|
| `profiles` | Utilisateurs (extension auth.users) |
| `cities` | Villes/destinations |
| `zones` | Zones géographiques par ville |
| `hotels` | Fiches hôtels complètes |
| `hotel_scores` | Notes détaillées par critère |
| `hotel_reviews` | Avis et synthèses |
| `hotel_price_snapshots` | Historique des prix observés |
| `client_profiles` | Profils types de clientèle |
| `hotel_profile_matches` | Association hôtel ↔ profil |
| `hotel_media` | Images et pièces jointes |
| `sources` | Sources et liens externes |
| `offer_requests` | Demandes d'offres clients |
| `offer_recommendations` | Hôtels recommandés par offre |
| `activity_log` | Journal d'activité |

---

## 🔐 Sécurité (RLS)

Row Level Security activé sur toutes les tables :

| Rôle | Permissions |
|------|-------------|
| `admin` | Accès complet à tout |
| `agent` | Lecture + création + modification |
| `readonly` | Lecture seule |

---

## 🎨 Stack technique

- **Next.js 14** App Router + TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** Auth + Database + Storage + RLS
- **React Hook Form** + **Zod**
- **date-fns** pour les dates
- **Lucide Icons**
- Déploiement **Vercel**

---

## 📊 Données de démonstration

Le seed inclut :
- 4 villes (Agadir, Marrakech, Djerba, Hammamet)
- 8 zones géographiques
- 8 hôtels avec fiches complètes
- Notes détaillées pour chaque hôtel
- 10 profils clients configurés
- Associations hôtels ↔ profils
- Sources web pour plusieurs hôtels

---

## 🛠️ Configuration Supabase Storage

Le bucket `hotel-media` est créé automatiquement par la migration avec :
- Fichiers publics
- Limite : 10 MB par fichier
- Types acceptés : JPEG, PNG, WebP, GIF, PDF

---

## 📝 Variables d'environnement

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme (publique) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (privée, côté serveur) |

---

## 🤝 Ajouter un utilisateur

Dans Supabase → Authentication → Users → Invite user

Puis définir son rôle :

```sql
UPDATE public.profiles SET role = 'agent' WHERE email = 'nouvel@agent.com';
```

---

*HotelScope v1.0 — Construit avec Next.js 14 & Supabase*
