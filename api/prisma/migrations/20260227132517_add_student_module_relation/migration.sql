-- AlterTable
ALTER TABLE "User" ADD COLUMN     "learningModuleId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_learningModuleId_fkey" FOREIGN KEY ("learningModuleId") REFERENCES "LearningModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
