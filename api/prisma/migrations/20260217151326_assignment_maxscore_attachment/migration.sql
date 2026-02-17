-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "attachmentMimeType" TEXT,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentSize" INTEGER,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "maxScore" INTEGER NOT NULL DEFAULT 20;
