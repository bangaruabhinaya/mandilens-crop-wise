# Supabase Database Migration & Setup Guide

This guide describes how to apply the PostgreSQL schema, indexes, constraints, RLS policies, and seed data to your Supabase project.

---

## 1. Prerequisites
1. Create an account at [https://supabase.com](https://supabase.com) and create a new project (e.g., `crop-market-net-return`).
2. Copy your **Project URL** and **anon/public key** (or **service_role key**) from **Project Settings > API**.

---

## 2. Apply Schema & Migrations

### Option A: Using the Supabase Web SQL Editor (Recommended)
1. Open your Supabase Project Dashboard.
2. In the left navigation, click on **SQL Editor**.
3. Click **New query**.
4. Open the migration file:
   [`db/migrations/20261027000001_init_crop_market.sql`](db/migrations/20261027000001_init_crop_market.sql)
5. Paste the complete SQL contents into the query editor and click **Run** (or `Ctrl+Enter`).
6. Verify that the following tables appear under **Database > Tables**:
   - `users_profile`
   - `crops`
   - `crop_grades`
   - `markets`
   - `market_quotes`
   - `grower_lots`
   - `selling_decisions`
   - `decision_audit_logs`
   - `system_settings`

---

## 3. Seed Realistic Demonstration Data
1. In the **SQL Editor**, open another **New query**.
2. Open the seed file:
   [`db/seed.sql`](db/seed.sql)
3. Paste the contents and click **Run**.
4. This seeds:
   - 4 User Profiles (`Farmer Ramesh`, `Operator Balwinder`, `Admin Vikram`, `Visitor Demo`)
   - 8 Agricultural Crops (`Sharbati Wheat`, `Basmati Paddy`, `Soybean`, `Onion`, etc.)
   - 11 Crop Grades with quality specifications
   - 7 Mandis & Terminal Markets (`Local Sehore Yard`, `Indore APMC`, `Azadpur Delhi`, `Lasalgaon`, etc.)
   - 12 Dated Market Quotes (including fresh today quotes and deliberate >48h stale quotes to demonstrate warning flags)
   - 3 Grower Lots ready for market
   - Realistic Saved Selling Decisions with deduction audit trail

---

## 4. Configure Application Environment
Create a `.env` file in the root directory (copied from `.env.example`):
```bash
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
STALE_QUOTE_THRESHOLD_HOURS=48
DEFAULT_TRANSPORT_RATE=0.85
```

---

## 5. Row Level Security (RLS) Verification
All tables have Row Level Security (RLS) enabled:
- **Crops & Markets**: Public read-only; staff/admins can edit.
- **Market Quotes**: Public read; authenticated staff/operators can log quotes.
- **Selling Decisions & Grower Lots**: Scoped strictly to the authenticated user ID (`user_id = auth.uid()`), while Admins retain oversight.
- **Decision Audit Logs**: Accessible by the decision owner or Administrator.
