-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'SALES_OPERATOR', 'INVENTORY_OPERATOR');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "VoucherTypeCode" AS ENUM ('PURCHASE', 'SALES', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "InventoryTxnType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "InvoiceDocumentType" AS ENUM ('INVOICE', 'PROFORMA', 'QUOTATION', 'ESTIMATE');

-- CreateEnum
CREATE TYPE "GstType" AS ENUM ('CGST_SGST', 'IGST');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('ISSUED', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BankTxnType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'RECONCILED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'REFRESH', 'VIEW', 'EXPORT', 'PRINT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('INR', 'USD', 'EUR', 'GBP');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMPTZ(6),
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" UUID,
    "user_agent" TEXT,
    "ip_address" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "contact_number" VARCHAR(20),
    "email" VARCHAR(255),
    "gst_number" VARCHAR(50),
    "pan_number" VARCHAR(20),
    "state" VARCHAR(100),
    "state_code" VARCHAR(10),
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "financial_year_start" DATE NOT NULL,
    "financial_year_end" DATE NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_company_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_years" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "year_name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_groups" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_group_id" UUID,
    "group_type" "GroupType" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ledger_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledgers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "ledger_group_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "opening_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "ledger_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mobile" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "gst_number" VARCHAR(50),
    "pan_number" VARCHAR(20),
    "state" VARCHAR(100),
    "state_code" VARCHAR(10),
    "opening_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(18,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "ledger_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mobile" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "gst_number" VARCHAR(50),
    "pan_number" VARCHAR(20),
    "state" VARCHAR(100),
    "state_code" VARCHAR(10),
    "opening_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "symbol" VARCHAR(20),
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_groups" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_group_id" UUID,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "stock_group_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "barcode" VARCHAR(100),
    "description" TEXT,
    "hsn_code" VARCHAR(20),
    "purchase_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "selling_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "mrp" DECIMAL(18,2),
    "gst_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "opening_quantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "current_quantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reorder_level" DECIMAL(18,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "voucher_id" UUID,
    "stock_item_id" UUID NOT NULL,
    "transaction_type" "InventoryTxnType" NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "batch_number" VARCHAR(100),
    "remarks" TEXT,
    "transaction_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_types" (
    "id" UUID NOT NULL,
    "code" "VoucherTypeCode" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "voucher_type_id" UUID NOT NULL,
    "voucher_number" VARCHAR(100) NOT NULL,
    "reference_number" VARCHAR(100),
    "voucher_date" DATE NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "narration" TEXT,
    "party_ledger_id" UUID,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_entries" (
    "id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "ledger_id" UUID NOT NULL,
    "entry_type" "EntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "narration" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "voucher_id" UUID,
    "invoice_number" VARCHAR(100) NOT NULL,
    "reference_number" VARCHAR(100),
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "document_type" "InvoiceDocumentType" NOT NULL DEFAULT 'INVOICE',
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cess_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "round_off" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance_due" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "terms_conditions" TEXT,
    "pdf_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "stock_item_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "hsn_code" VARCHAR(20),
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gst_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cess_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "note_number" VARCHAR(100) NOT NULL,
    "note_date" DATE NOT NULL,
    "original_invoice_id" UUID,
    "reason" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_items" (
    "id" UUID NOT NULL,
    "credit_note_id" UUID NOT NULL,
    "stock_item_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "gst_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_notes" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "note_number" VARCHAR(100) NOT NULL,
    "note_date" DATE NOT NULL,
    "original_voucher_id" UUID,
    "reason" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_note_items" (
    "id" UUID NOT NULL,
    "debit_note_id" UUID NOT NULL,
    "stock_item_id" UUID NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "gst_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debit_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "voucher_id" UUID,
    "invoice_id" UUID,
    "gst_type" "GstType" NOT NULL,
    "hsn_code" VARCHAR(20),
    "taxable_amount" DECIMAL(18,2) NOT NULL,
    "cgst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cess_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_tax" DECIMAL(18,2) NOT NULL,
    "return_period" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "bank_ledger_id" UUID NOT NULL,
    "voucher_id" UUID,
    "transaction_type" "BankTxnType" NOT NULL,
    "transaction_date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference" VARCHAR(100),
    "description" TEXT,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_at" TIMESTAMPTZ(6),
    "reconcile_status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "bank_statement_ref" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cheques" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cheque_number" VARCHAR(50) NOT NULL,
    "cheque_date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payee_name" VARCHAR(255),
    "party_type" VARCHAR(20),
    "party_id" UUID,
    "bank_name" VARCHAR(255),
    "status" "ChequeStatus" NOT NULL DEFAULT 'ISSUED',
    "cleared_date" DATE,
    "bounced_date" DATE,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "user_id" UUID NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "action" "AuditAction" NOT NULL,
    "description" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(255),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "companies_created_by_idx" ON "companies"("created_by");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_is_active_idx" ON "companies"("is_active");

-- CreateIndex
CREATE INDEX "user_company_roles_user_id_idx" ON "user_company_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_company_roles_company_id_idx" ON "user_company_roles"("company_id");

-- CreateIndex
CREATE INDEX "user_company_roles_role_idx" ON "user_company_roles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_company_roles_user_id_company_id_key" ON "user_company_roles"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "financial_years_company_id_idx" ON "financial_years"("company_id");

-- CreateIndex
CREATE INDEX "financial_years_is_current_idx" ON "financial_years"("is_current");

-- CreateIndex
CREATE UNIQUE INDEX "financial_years_company_id_year_name_key" ON "financial_years"("company_id", "year_name");

-- CreateIndex
CREATE INDEX "ledger_groups_company_id_idx" ON "ledger_groups"("company_id");

-- CreateIndex
CREATE INDEX "ledger_groups_parent_group_id_idx" ON "ledger_groups"("parent_group_id");

-- CreateIndex
CREATE INDEX "ledger_groups_group_type_idx" ON "ledger_groups"("group_type");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_groups_company_id_name_key" ON "ledger_groups"("company_id", "name");

-- CreateIndex
CREATE INDEX "ledgers_company_id_idx" ON "ledgers"("company_id");

-- CreateIndex
CREATE INDEX "ledgers_ledger_group_id_idx" ON "ledgers"("ledger_group_id");

-- CreateIndex
CREATE INDEX "ledgers_is_active_idx" ON "ledgers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ledgers_company_id_name_key" ON "ledgers"("company_id", "name");

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "customers"("company_id");

-- CreateIndex
CREATE INDEX "customers_ledger_id_idx" ON "customers"("ledger_id");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_mobile_idx" ON "customers"("mobile");

-- CreateIndex
CREATE INDEX "customers_is_active_idx" ON "customers"("is_active");

-- CreateIndex
CREATE INDEX "suppliers_company_id_idx" ON "suppliers"("company_id");

-- CreateIndex
CREATE INDEX "suppliers_ledger_id_idx" ON "suppliers"("ledger_id");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_is_active_idx" ON "suppliers"("is_active");

-- CreateIndex
CREATE INDEX "units_company_id_idx" ON "units"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_company_id_name_key" ON "units"("company_id", "name");

-- CreateIndex
CREATE INDEX "stock_groups_company_id_idx" ON "stock_groups"("company_id");

-- CreateIndex
CREATE INDEX "stock_groups_parent_group_id_idx" ON "stock_groups"("parent_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_groups_company_id_name_key" ON "stock_groups"("company_id", "name");

-- CreateIndex
CREATE INDEX "stock_items_company_id_idx" ON "stock_items"("company_id");

-- CreateIndex
CREATE INDEX "stock_items_stock_group_id_idx" ON "stock_items"("stock_group_id");

-- CreateIndex
CREATE INDEX "stock_items_unit_id_idx" ON "stock_items"("unit_id");

-- CreateIndex
CREATE INDEX "stock_items_name_idx" ON "stock_items"("name");

-- CreateIndex
CREATE INDEX "stock_items_is_active_idx" ON "stock_items"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_company_id_sku_key" ON "stock_items"("company_id", "sku");

-- CreateIndex
CREATE INDEX "inventory_transactions_company_id_idx" ON "inventory_transactions"("company_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_voucher_id_idx" ON "inventory_transactions"("voucher_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_stock_item_id_idx" ON "inventory_transactions"("stock_item_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_transaction_date_idx" ON "inventory_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "inventory_transactions_transaction_type_idx" ON "inventory_transactions"("transaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_types_code_key" ON "voucher_types"("code");

-- CreateIndex
CREATE INDEX "vouchers_company_id_idx" ON "vouchers"("company_id");

-- CreateIndex
CREATE INDEX "vouchers_voucher_type_id_idx" ON "vouchers"("voucher_type_id");

-- CreateIndex
CREATE INDEX "vouchers_voucher_date_idx" ON "vouchers"("voucher_date");

-- CreateIndex
CREATE INDEX "vouchers_created_by_idx" ON "vouchers"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_company_id_voucher_number_key" ON "vouchers"("company_id", "voucher_number");

-- CreateIndex
CREATE INDEX "voucher_entries_voucher_id_idx" ON "voucher_entries"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_entries_ledger_id_idx" ON "voucher_entries"("ledger_id");

-- CreateIndex
CREATE INDEX "voucher_entries_entry_type_idx" ON "voucher_entries"("entry_type");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_voucher_id_key" ON "invoices"("voucher_id");

-- CreateIndex
CREATE INDEX "invoices_company_id_idx" ON "invoices"("company_id");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_invoice_date_idx" ON "invoices"("invoice_date");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_invoice_number_key" ON "invoices"("company_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_stock_item_id_idx" ON "invoice_items"("stock_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_voucher_id_key" ON "credit_notes"("voucher_id");

-- CreateIndex
CREATE INDEX "credit_notes_company_id_idx" ON "credit_notes"("company_id");

-- CreateIndex
CREATE INDEX "credit_notes_customer_id_idx" ON "credit_notes"("customer_id");

-- CreateIndex
CREATE INDEX "credit_notes_note_date_idx" ON "credit_notes"("note_date");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_company_id_note_number_key" ON "credit_notes"("company_id", "note_number");

-- CreateIndex
CREATE INDEX "credit_note_items_credit_note_id_idx" ON "credit_note_items"("credit_note_id");

-- CreateIndex
CREATE INDEX "credit_note_items_stock_item_id_idx" ON "credit_note_items"("stock_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "debit_notes_voucher_id_key" ON "debit_notes"("voucher_id");

-- CreateIndex
CREATE INDEX "debit_notes_company_id_idx" ON "debit_notes"("company_id");

-- CreateIndex
CREATE INDEX "debit_notes_supplier_id_idx" ON "debit_notes"("supplier_id");

-- CreateIndex
CREATE INDEX "debit_notes_note_date_idx" ON "debit_notes"("note_date");

-- CreateIndex
CREATE UNIQUE INDEX "debit_notes_company_id_note_number_key" ON "debit_notes"("company_id", "note_number");

-- CreateIndex
CREATE INDEX "debit_note_items_debit_note_id_idx" ON "debit_note_items"("debit_note_id");

-- CreateIndex
CREATE INDEX "debit_note_items_stock_item_id_idx" ON "debit_note_items"("stock_item_id");

-- CreateIndex
CREATE INDEX "gst_records_company_id_idx" ON "gst_records"("company_id");

-- CreateIndex
CREATE INDEX "gst_records_gst_type_idx" ON "gst_records"("gst_type");

-- CreateIndex
CREATE INDEX "gst_records_return_period_idx" ON "gst_records"("return_period");

-- CreateIndex
CREATE INDEX "gst_records_voucher_id_idx" ON "gst_records"("voucher_id");

-- CreateIndex
CREATE INDEX "gst_records_invoice_id_idx" ON "gst_records"("invoice_id");

-- CreateIndex
CREATE INDEX "bank_transactions_company_id_idx" ON "bank_transactions"("company_id");

-- CreateIndex
CREATE INDEX "bank_transactions_bank_ledger_id_idx" ON "bank_transactions"("bank_ledger_id");

-- CreateIndex
CREATE INDEX "bank_transactions_transaction_date_idx" ON "bank_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "bank_transactions_is_reconciled_idx" ON "bank_transactions"("is_reconciled");

-- CreateIndex
CREATE INDEX "cheques_company_id_idx" ON "cheques"("company_id");

-- CreateIndex
CREATE INDEX "cheques_status_idx" ON "cheques"("status");

-- CreateIndex
CREATE INDEX "cheques_cheque_date_idx" ON "cheques"("cheque_date");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_company_id_cheque_number_key" ON "cheques"("company_id", "cheque_number");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_idx" ON "audit_logs"("company_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_roles" ADD CONSTRAINT "user_company_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_roles" ADD CONSTRAINT "user_company_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_years" ADD CONSTRAINT "financial_years_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_groups" ADD CONSTRAINT "ledger_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_groups" ADD CONSTRAINT "ledger_groups_parent_group_id_fkey" FOREIGN KEY ("parent_group_id") REFERENCES "ledger_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_ledger_group_id_fkey" FOREIGN KEY ("ledger_group_id") REFERENCES "ledger_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_groups" ADD CONSTRAINT "stock_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_groups" ADD CONSTRAINT "stock_groups_parent_group_id_fkey" FOREIGN KEY ("parent_group_id") REFERENCES "stock_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_stock_group_id_fkey" FOREIGN KEY ("stock_group_id") REFERENCES "stock_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_stock_item_id_fkey" FOREIGN KEY ("stock_item_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_voucher_type_id_fkey" FOREIGN KEY ("voucher_type_id") REFERENCES "voucher_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_entries" ADD CONSTRAINT "voucher_entries_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_entries" ADD CONSTRAINT "voucher_entries_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_stock_item_id_fkey" FOREIGN KEY ("stock_item_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_stock_item_id_fkey" FOREIGN KEY ("stock_item_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note_items" ADD CONSTRAINT "debit_note_items_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note_items" ADD CONSTRAINT "debit_note_items_stock_item_id_fkey" FOREIGN KEY ("stock_item_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_records" ADD CONSTRAINT "gst_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_ledger_id_fkey" FOREIGN KEY ("bank_ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
