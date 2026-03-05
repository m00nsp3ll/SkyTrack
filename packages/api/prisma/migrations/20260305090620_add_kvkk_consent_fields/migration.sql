-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "kvkk_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kvkk_consent_at" TIMESTAMP(3);
