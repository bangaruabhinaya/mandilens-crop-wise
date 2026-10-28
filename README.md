# 🌾 Crop-Wise Market Price Comparison and Selling Decision Log
*(KisanNet Intel — Agricultural Net-Return Intelligence)*

A web application designed for agricultural growers, farm cooperatives, and market operators. It solves the **Headline Price Trap** by comparing **realized cash-in-hand net return** across competing mandis, private terminals, and direct processors after factoring in freight distance, hamali (unloading/loading), state APMC commission, market development cess, bagging, and quality/moisture refraction cuts.

---

## 🌟 The Problem Solved

Growers frequently make critical transit and dispatch decisions based solely on raw headline/modal quotes broadcast from distant terminal markets (e.g., *"Azadpur Mandi is ₹3,290/quintal while our regional APMC is ₹2,980/quintal"*). 

However, distant markets impose heavy deductions:
- **High-mileage freight costs** (e.g., 780 km @ ₹0.85/km/qtl = ₹663/qtl or ₹43,000+ per truckload).
- **APMC Market Commission & Development Cess** (2% to 4.5% of gross value).
- **Mandi Hamali & Unloading labor** (₹18 – ₹26/qtl).
- **Bagging / Gunny bag packaging costs** (₹20/qtl).
- **Refraction, moisture cuts, and weighbridge dispute deductions**.

When all logistics and market regulatory deductions are computed, **the distant headline price often yields a net financial loss** compared to regional APMCs or direct cooperative hubs with zero commission. This application gives growers full transparency before loading the truck.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: Semantic HTML5, Custom CSS3 (earthy cream `#FAF7F2`, leaf green `#1E4D2B`, and golden marigold `#D97706`), Vanilla JavaScript (ES6+ modular). Zero heavy third-party JS frameworks or bloated dependencies. Custom HTML5 Canvas line chart for price & net-return historical trends.
- **Backend**: Node.js & Express.js REST API with clean layer separation:
  - `server.js`: Express bootstrap, CORS, JSON parsing, static serving, error handler.
  - `src/controllers/`: Auth, Crops, Markets, Quotes, Comparison, Decisions, CSV, Analytics.
  - `src/services/`: Net-Return Engine, Staleness Engine, Audit Trail Service.
  - `src/middleware/`: Authentication, Role-based Authorization, Input Validation, Error Handling.
  - `src/models/`: Supabase PostgreSQL adapter with local seeded engine fallback.
- **Database**: Supabase PostgreSQL.
  - 9 normalized tables with foreign keys, constraints, and indexes.
  - Supabase Row Level Security (RLS) policies protecting grower records.
  - Realistic synthetic seed dataset of Indian agricultural commodities, grades, and mandis.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **Dated Market Quotes with Source** | Track min, modal, and max quotes with recorded arrival volumes and sources (APMC Daily Gate Register, e-NAM, Direct Processor Counter, Trader Desk). |
| **Logistics & Deductions Modeling** | Granular inputs for distance (km), freight rate per km/quintal, hamali/handling, commission %, cess %, bagging cost, and quality cuts. |
| **Net-Return Comparison Engine** | Side-by-side ranking of candidate markets with Winner Spotlight, advantage vs nearest mandi, and actionable grower takeaway notes. |
| **Stale-Data Warning System** | Automatic 48-hour freshness threshold detector. Quotes older than 48 hours trigger high-visibility warning badges and alert banners to prevent transit misjudgments. |
| **Selling Decision Log** | Grower decision journal to record planned lots, target markets, planned net return, and custom rationales. |
| **Sale Reconciliation & Reflection** | Mark records as `Dispatched` or `Sold`. Reconcile actual realized auction payouts against estimates with variance reflections. |
| **Audit Trail History** | Event log tracking status transitions (`Planned` ➔ `Dispatched` ➔ `Sold` / `Cancelled`) with actor ID, timestamp, and metadata. |
| **CSV Import & Export** | 1-Click CSV export of quotes and decision logs; batch CSV quote import with format validation and row-by-row error reporting. |
| **Vanilla Canvas History Chart** | Interactive 14-day time series chart rendering official modal prices (solid line) vs realized net returns (dashed line). |
| **Operational Analytics Dashboard** | High-level metrics: Total decisions logged, volume sold, net realized earnings, deductions paid, and recommended best-net mandis. |
| **Role Hierarchy & Persona Switcher** | Least-privilege access for Visitor, Farmer, Operator, and Admin with an instant navbar persona switcher for evaluator testing. |

---

## 👥 Role Hierarchy & Permissions

1. **Visitor**:
   - Accesses public landing page, interactive headline trap infographic, and instant sandbox calculator.
   - Read-only access to public quotes and crop catalog.
2. **Grower / Farmer (Registered User)**:
   - Manages personal farm decisions, calculates custom net-return comparisons, and saves decisions.
   - Dispatches lots, reconciles final auction sales, and exports personal decision logs to CSV.
   - Enforced by RLS: Farmers can only view and mutate their own decision logs.
3. **Market Operator / APMC Secretary**:
   - Submits official dated mandi quotes.
   - Batch imports quotes via CSV.
   - Manages mandi fee schedules and verifies farmer-submitted quotes.
4. **Administrator**:
   - Manages crops, varieties/grades, markets, user roles, system parameters, and audit logs.

---

## 📂 Project Directory Structure

```
├── db/
│   ├── migrations/
│   │   └── 20261027000001_init_crop_market.sql  # Complete schema, RLS, & indexes
│   ├── seed.sql                                # Realistic synthetic seed data
│   └── supabase-guide.md                       # Supabase migration walkthrough
├── public/
│   ├── css/
│   │   ├── main.css                            # Global theme & typography
│   │   ├── landing.css                         # Hero & headline trap styles
│   │   └── app.css                             # Comparison, tables & card layouts
│   ├── js/
│   │   ├── api.js                              # Express REST client
│   │   ├── state.js                            # Global reactive state
│   │   ├── ui.js                               # View router, toasts, modal handlers
│   │   ├── charts.js                           # Vanilla HTML5 Canvas chart
│   │   ├── calculator.js                       # Net-Return comparison workspace
│   │   ├── decisions.js                        # Selling decision log & reconciliation
│   │   ├── quotes.js                           # Mandi quotes & CSV import/export
│   │   └── app.js                              # Main bootstrap & persona switcher
│   └── index.html                              # Semantic single-page HTML5 UI
├── src/
│   ├── config/index.js                         # Environment & application config
│   ├── controllers/                            # Express route controllers
│   ├── middleware/                             # Auth, validation, error handlers
│   ├── models/db.js                            # Supabase client & dual-mode adapter
│   ├── routes/                                 # Modular REST API routes
│   └── services/                               # Business calculation engines & audit
├── tests/
│   └── run-tests.js                            # 32 automated unit & integration tests
├── .env.example                                # Environment variable template
├── package.json                                # Scripts and dependencies
└── server.js                                   # Main Express bootstrap
```

---

## ⚙️ Local Setup & Execution Instructions

### 1. Prerequisites
- Node.js (v18.x, v20.x, or v22.x LTS)
- npm (v9.x or higher)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the template file:
```bash
cp .env.example .env
```
*(The application works immediately out-of-the-box with seeded data if Supabase credentials are not yet configured).*

### 4. Run the Application
```bash
npm start
```
The server will start at **http://localhost:3000**. Open your browser to access the application.

---

## 🗄️ Supabase PostgreSQL Setup & Migration

To connect to your cloud Supabase database:
1. Create a project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings > API** and copy `Project URL` and `anon key` (or `service_role key`).
3. Add these to your `.env` file:
   ```env
   SUPABASE_URL=https://<your-project-id>.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```
4. Open the Supabase **SQL Editor** in your browser:
   - Run [`db/migrations/20261027000001_init_crop_market.sql`](db/migrations/20261027000001_init_crop_market.sql) to create all 9 tables, indexes, and RLS policies.
   - Run [`db/seed.sql`](db/seed.sql) to load realistic agricultural seed data.
5. Restart the server (`npm start`). The top banner will display:
   `🟢 Supabase Connected: PostgreSQL RLS Active`.

---

## 🧪 Testing & Verification

Run the comprehensive automated test suite:
```bash
npm test
```

### Verified Test Results (32 Passed, 0 Failed):
- **Business Math Verification**:
  - Exact gross revenue calculation: `volume × headlinePrice`.
  - Freight transport calculation: `distance × rate × volume`.
  - APMC commission % and development cess % calculations.
  - Deductions summation and net realized price per quintal.
  - Proved the **Headline Price Trap**: Indore APMC (@ ₹2,980 quote) yielded **+₹21,931 higher net cash** than Azadpur (@ ₹3,290 quote).
  - Stale quote detection: correctly flagged 5-day old quote as `VERY_STALE` while today's quote evaluated as `FRESH`.
- **API & REST Endpoint Checks**:
  - `GET /api/health` ➔ 200 OK
  - `GET /api/auth/status` ➔ 200 OK
  - `GET /api/crops` & `GET /api/crops/grades` ➔ 200 OK
  - `GET /api/markets` ➔ 200 OK
  - `GET /api/quotes` with filters and `stale_only=true` ➔ 200 OK
  - `POST /api/quotes` input validation (rejects negative numbers, accepts valid) ➔ 400 & 201 OK
  - `POST /api/comparison/compare` ➔ 200 OK with ranked Winner spotlight
  - `POST /api/decisions` ➔ 201 Created
  - `PATCH /api/decisions/:id` (transitions status `Planned` ➔ `Dispatched` ➔ `Sold` with realized price reconciliation) ➔ 200 OK
  - `GET /api/decisions/:id` audit trail verification (all state changes logged) ➔ 200 OK
  - Role Boundary Test: Visitor forbidden from creating persistent decision records ➔ 403 Forbidden
  - `GET /api/csv/export-quotes` & `GET /api/csv/export-decisions` ➔ 200 OK with CSV headers
  - `POST /api/csv/import-quotes` (CSV parsing and row insertion) ➔ 200 OK
  - `GET /api/analytics/dashboard` & `GET /api/analytics/price-history` ➔ 200 OK

---

## 📡 API Reference Documentation

| Method | Endpoint | Description | Roles Allowed |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status | Public |
| `GET` | `/api/auth/status` | DB connection and table stats | Public |
| `GET` | `/api/auth/personas` | Available demo persona profiles | Public |
| `POST`| `/api/auth/switch-persona` | Switch active testing persona | Public |
| `GET` | `/api/crops` | List all active crops | Public |
| `GET` | `/api/crops/grades?cropId=...` | List grades for a crop | Public |
| `POST`| `/api/crops` | Add new crop | Operator, Admin |
| `GET` | `/api/markets` | List all tracked mandis | Public |
| `POST`| `/api/markets` | Add new mandi | Operator, Admin |
| `GET` | `/api/quotes` | Filtered dated market quotes | Public |
| `POST`| `/api/quotes` | Submit new mandi quote | Farmer, Operator, Admin |
| `POST`| `/api/comparison/compare` | Run live multi-mandi net comparison | Public / Authenticated |
| `POST`| `/api/comparison/quick-calculate` | Instant sandbox calculation | Public |
| `GET` | `/api/decisions` | Get grower's saved decisions | Farmer, Admin |
| `POST`| `/api/decisions` | Save decision from comparison | Farmer, Admin |
| `PATCH`| `/api/decisions/:id` | Update status & reconcile sale | Farmer, Admin |
| `DELETE`| `/api/decisions/:id` | Remove decision record | Farmer, Admin |
| `GET` | `/api/csv/export-quotes` | Download quotes as CSV | Public |
| `GET` | `/api/csv/export-decisions` | Download decision log as CSV | Farmer, Admin |
| `POST`| `/api/csv/import-quotes` | Batch import mandi quotes from CSV | Operator, Admin |
| `GET` | `/api/analytics/dashboard` | KPI metrics & best-net mandis | Public / Authenticated |
| `GET` | `/api/analytics/price-history` | 14-day time series for charts | Public |

---

## ⚠️ Known Limitations & Deployment Notes

1. **Live Government e-NAM Feed**: External state APMC / Agmarknet live feeds require licensed government API credentials and IP whitelisting; as specified, realistic synthetic seed data and manual/CSV fallback are implemented and active.
2. **SMS / WhatsApp Dispatch Alerts**: Automated dispatch notifications are logged into the PostgreSQL audit log and UI rather than sending third-party carrier SMS messages.
3. **Deployment**: The application can be deployed to Render, Railway, Fly.io, Heroku, or AWS EC2 by specifying `npm start`. Set the environment variables defined in `.env.example` in the hosting dashboard.
