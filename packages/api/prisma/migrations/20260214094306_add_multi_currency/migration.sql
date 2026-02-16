-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD', 'GBP', 'RUB', 'TRY');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "price_currency" "Currency" NOT NULL DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "is_split_payment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primary_currency" "Currency" NOT NULL DEFAULT 'TRY',
ADD COLUMN     "total_amount_eur" DOUBLE PRECISION,
ADD COLUMN     "total_amount_try" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "base_currency" "Currency" NOT NULL DEFAULT 'EUR',
    "currency" "Currency" NOT NULL,
    "buy_rate" DOUBLE PRECISION NOT NULL,
    "sell_rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'TCMB',
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_history" (
    "id" TEXT NOT NULL,
    "base_currency" "Currency" NOT NULL DEFAULT 'EUR',
    "currency" "Currency" NOT NULL,
    "buy_rate" DOUBLE PRECISION NOT NULL,
    "sell_rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_details" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amount_in_eur" DOUBLE PRECISION NOT NULL,
    "amount_in_try" DOUBLE PRECISION NOT NULL,
    "exchange_rate" DOUBLE PRECISION NOT NULL,
    "exchange_source" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_base_currency_currency_key" ON "exchange_rates"("base_currency", "currency");

-- CreateIndex
CREATE INDEX "exchange_rate_history_currency_fetched_at_idx" ON "exchange_rate_history"("currency", "fetched_at");

-- AddForeignKey
ALTER TABLE "payment_details" ADD CONSTRAINT "payment_details_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
