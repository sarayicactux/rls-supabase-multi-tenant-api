# Multi-Tenant Orders API

A multi-tenant API built with Express + TypeScript + Supabase Auth and PostgreSQL RLS.

Goal: even if a user knows another company's order ID, they must not be able to read, update, or delete it. Final authorization is enforced by database policies, not by the `company_id` sent from the frontend.

## Prerequisites

- Node.js LTS
- A [Supabase](https://supabase.com) project
- Migration and seed applied (test users are created by the seed)

## Install

```bash
cd multi-tenant-api
npm install
```

## Environment

Fill `.env` with values from the Supabase dashboard (API section):

```env
PORT=3000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the Publishable key. Do not put management secrets (`service_role`) in this API for normal user requests.

## Database (Migration + Seed)

1. In Supabase open **SQL Editor → New query** (default role should be `postgres`, not `authenticated`)
2. Run `supabase/migrations/001_multitenant.sql`
3. Run the full `supabase/seed.sql` file

If the users do not already exist, the seed creates these accounts:

| Email | Password |
|--------|------|
| `user-a@example.com` | `Password123!` |
| `user-b@example.com` | `Password123!` |

After a successful run you should see three verification results: Auth users, memberships, and orders.

```sql
select
    c.name as company_name,
    u.email
from public.company_members cm
join public.companies c on c.id = cm.company_id
join auth.users u on u.id = cm.user_id
order by c.name;
```

## Run

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

After the server starts:

| URL | Description |
|------|--------|
| `http://localhost:3000/health` | Health check |
| `http://localhost:3000/api/docs` | **Swagger UI** |
| `http://localhost:3000/api/docs.json` | OpenAPI spec as JSON |

## Open Swagger

1. Start the server with `npm run dev`
2. Open:

```text
http://localhost:3000/api/docs
```

3. Call `POST /api/auth/login` (for example `user-a@example.com` / `Password123!`)
4. Copy `access_token` from the response
5. Click **Authorize** and paste the token
6. Test the Orders endpoints with **Try it out**

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|--------|
| `GET` | `/health` | No | Health check |
| `POST` | `/api/auth/login` | No | Sign in and get an access token |
| `GET` | `/api/auth/me` | Yes | Current user |
| `GET` | `/api/orders` | Yes | List visible orders |
| `GET` | `/api/orders?company_id=...` | Yes | Filter by company (still RLS-scoped) |
| `POST` | `/api/orders` | Yes | Create order |
| `PATCH` | `/api/orders/:id` | Yes | Update `title` / `amount` |
| `DELETE` | `/api/orders/:id` | Yes | Delete order |

## Quick curl tests

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user-a@example.com\",\"password\":\"Password123!\"}"

# Only orders for the caller's company
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN"

# Filter another company → empty array
curl "http://localhost:3000/api/orders?company_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN"

# Allowed create
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\",\"title\":\"New order\",\"amount\":150}"

# Update another company's order → 404
curl -X PATCH http://localhost:3000/api/orders/22222222-2222-4222-8222-222222222222 \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Hacked order\",\"amount\":1}"
```

Seed IDs:

| Item | UUID |
|------|------|
| Company A | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` |
| Company B | `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` |
| Order A | `11111111-1111-4111-8111-111111111111` |
| Order B | `22222222-2222-4222-8222-222222222222` |

## Project structure

```text
multi-tenant-api/
├── src/
│   ├── config/env.ts
│   ├── docs/openapi.ts      # OpenAPI document
│   ├── docs/swagger.ts      # Swagger UI setup
│   ├── lib/supabase.ts
│   ├── middleware/authenticate.ts
│   ├── routes/auth.routes.ts
│   ├── routes/orders.routes.ts
│   ├── types/express.d.ts
│   └── app.ts
├── supabase/
│   ├── migrations/001_multitenant.sql
│   ├── seed.sql
│   └── tests/rls.test.sql
├── .env
├── package.json
└── tsconfig.json
```

## Security notes

- A client-supplied `company_id` alone does not grant access; RLS makes the final decision
- Users cannot change their own memberships from the client
- PATCH only allows `title` and `amount`; `company_id` cannot be changed via the API
- UPDATE policies use both `USING` and `WITH CHECK` to block moving an order to another company
- Internal database errors are not returned raw to clients
