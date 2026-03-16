-- CreateTable
CREATE TABLE "ResourceViewEvent" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceViewEvent_resourceId_idx" ON "ResourceViewEvent"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceViewEvent_courseId_idx" ON "ResourceViewEvent"("courseId");

-- CreateIndex
CREATE INDEX "ResourceViewEvent_userId_idx" ON "ResourceViewEvent"("userId");

-- CreateIndex
CREATE INDEX "ResourceViewEvent_viewedAt_idx" ON "ResourceViewEvent"("viewedAt");

-- AddForeignKey
ALTER TABLE "ResourceViewEvent" ADD CONSTRAINT "ResourceViewEvent_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CourseResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceViewEvent" ADD CONSTRAINT "ResourceViewEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceViewEvent" ADD CONSTRAINT "ResourceViewEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
