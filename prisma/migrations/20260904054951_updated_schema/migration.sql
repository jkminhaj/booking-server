/*
  Warnings:

  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "firebaseId" DROP NOT NULL;
