/*
  Warnings:

  - You are about to alter the column `title` on the `TestCase` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `description` on the `TestCase` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5000)`.
  - You are about to alter the column `name` on the `TestSuite` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `description` on the `TestSuite` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.

*/
-- AlterTable
ALTER TABLE "TestCase" ALTER COLUMN "title" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(5000);

-- AlterTable
ALTER TABLE "TestSuite" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000);
