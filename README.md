# Route

Offline-capable delivery tracking PWA with a two-sheet Google Sheets backend.

## Architecture

The app uses **two sheets** for all data:

| Sheet | Purpose |
|-------|---------|
| **MASTER** | Single authoritative customer lookup (one row per customer) |
| **DATA** | Append-only event table for deliveries, location updates, and sync metadata |

### MASTER columns (A → I)

| # | Column | Type | Notes |
|---|--------|------|-------|
| 1 | `bp_number` | string | Primary key |
| 2 | `customer_name` | string | |
| 3 | `address` | string | |
| 4 | `phone` | string | |
| 5 | `is_active` | boolean | Verification flag |
| 6 | `notes` | string | |
| 7 | `lat` | number | Optional canonical latitude |
| 8 | `lng` | number | Optional canonical longitude |
| 9 | `created_at` | ISO timestamp | |

### DATA columns (A → V)

| # | Column | Type | Notes |
|---|--------|------|-------|
| 1 | `server_id` | string | UUID assigned by server |
| 2 | `local_id` | string | Client-generated UUID for idempotency |
| 3 | `bp_number` | string | Links to MASTER |
| 4 | `customer_name` | string | Denormalized |
| 5 | `agent_email` | string | |
| 6 | `action_type` | string | `complete_delivery`, `fail_delivery`, `location_update` |
| 7 | `status` | string | `delivered` / `failed` / `pending` |
| 8 | `delivery_type` | string | `bill` / `notice` / `parcel` |
| 9 | `barcode` | string | |
| 10 | `remarks` | string | |
| 11 | `lat` | number | |
| 12 | `lng` | number | |
| 13 | `accuracy` | number | |
| 14 | `sequence` | int | |
| 15 | `customer_count` | int | |
| 16 | `signature` | base64/url | |
| 17 | `written_at` | ISO timestamp | Client-created time |
| 18 | `received_at` | ISO timestamp | Server-received time |
| 19 | `synced` | boolean | `TRUE` after server insert |
| 20 | `conflict_flag` | string | `duplicate`, `conflict`, etc. |
| 21 | `source` | string | `pwa` or `phone-server` |
| 22 | `extra_json` | string | JSON for future-proofing |

## Setup

### PWA (GitHub Pages)

1. Clone this repository.
2. Set your Apps Script web-app URL in `js/sync.js` (`API_URL`).
3. Push to `main` — GitHub Pages deploys automatically via `.github/workflows/static.yml`.

### Apps Script backend

1. Create a Google Spreadsheet with two sheets named **MASTER** and **DATA**.
2. Add header rows matching the column tables above.
3. Open **Extensions → Apps Script** and paste the contents of `apps-script/Code.gs`.
4. Deploy as a web app (*Execute as: Me*, *Who has access: Anyone*).
5. Copy the deployment URL into `js/sync.js`.

## Offline behaviour

- Records are saved to **IndexedDB** with a client-generated `local_id`.
- When online, records sync in batches of 50 via `syncOfflineDeliveryBatch`.
- Duplicate `local_id` values are detected server-side and acknowledged without re-inserting.
- The MASTER customer list is cached locally and refreshed daily.