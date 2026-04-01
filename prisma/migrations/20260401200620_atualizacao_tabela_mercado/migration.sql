/*
  Warnings:

  - Changed the type of `vendedor_id` on the `Mercado` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Mercado" DROP COLUMN "vendedor_id",
ADD COLUMN     "vendedor_id" INTEGER NOT NULL;
