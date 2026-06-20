# SmartERP

> Billing, Inventory & Accounting Management System
> A Tally-inspired, keyboard-first, multi-tenant ERP built with Next.js + Express + Prisma + Supabase PostgreSQL.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + ShadCN UI + TanStack Table + React Hook Form + Zod
- **Backend:** Node.js + Express + TypeScript + Prisma ORM
- **Database:** PostgreSQL (Supabase) — multi-tenant with `company_id` isolation
- **Auth:** JWT (access 15m + refresh 7d, hashed + rotated)
- **PDF:** PDFKit
- **Excel:** ExcelJS
- **Deploy:** Vercel (web) + Render (api) + Supabase (db) — 100% free tier

## Monorepo Structure

```
Project/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # Express + Prisma backend
├── packages/
│   └── shared/       # Shared Zod schemas + TypeScript types
├── prisma/           # Single source of truth for DB (used by apps/api)
└── package.json      # npm workspaces root
```

## Quick Start

```bash
# Install dependencies (root + workspaces)
npm install

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Generate Prisma client + run migrations against Supabase
npm run prisma:generate
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Run dev servers (both api:4000 and web:3000)
npm run dev
```

## Build Order (14-day plan)

| Day | Deliverable |
|-----|-------------|
| 1 | Monorepo + Prisma schema + first migration on Supabase |
| 2 | Auth + RBAC |
| 3 | Companies + Financial Years + Settings |
| 4 | App shell + Dashboard + Command palette |
| 5 | Masters (Ledgers, Groups, Customers, Suppliers) |
| 6 | Inventory masters + Dashboard polish |
| 7 | Voucher engine: Purchase |
| 8 | Voucher engine: Sales + Contra |
| 9 | Voucher engine: Receipt + Payment + Journal |
| 10 | Credit Note + Debit Note |
| 11 | Billing + Invoice PDF |
| 12 | All reports + GST module |
| 13 | Banking + Audit log viewer + polish |
| 14 | Testing + Deploy + Submission |

## Engineering Rules

1. **Multi-tenant isolation** — every business table has `company_id`
2. **Voucher engine is the only source of truth** — inventory, invoices, reports derive from it
3. **Double-entry check** — `Σ debits = Σ credits` enforced before voucher save
4. **No negative stock** — checked inside the same Prisma transaction
5. **Soft deletes** — `is_active = false` for all business entities
6. **Composite uniques per company** — SKU, ledger name, voucher number, invoice number
7. **Refresh tokens hashed + rotated** on every use
8. **Single keyboard registry** — `shortcut.config.ts` for all shortcuts
9. **Audit log on every critical action**
10. **Demoable at end of every day**

## License

Private — Internship project.
