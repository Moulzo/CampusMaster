-- CreateTable
CREATE TABLE "ResourceDownloadEvent" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceDownloadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceDownloadEvent_resourceId_idx" ON "ResourceDownloadEvent"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceDownloadEvent_courseId_idx" ON "ResourceDownloadEvent"("courseId");

-- CreateIndex
CREATE INDEX "ResourceDownloadEvent_userId_idx" ON "ResourceDownloadEvent"("userId");

-- CreateIndex
CREATE INDEX "ResourceDownloadEvent_downloadedAt_idx" ON "ResourceDownloadEvent"("downloadedAt");

-- AddForeignKey
ALTER TABLE "ResourceDownloadEvent" ADD CONSTRAINT "ResourceDownloadEvent_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CourseResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDownloadEvent" ADD CONSTRAINT "ResourceDownloadEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDownloadEvent" ADD CONSTRAINT "ResourceDownloadEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
