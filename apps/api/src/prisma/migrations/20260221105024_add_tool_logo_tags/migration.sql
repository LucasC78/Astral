-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
