-- CreateTable
CREATE TABLE "_CourseTeachers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CourseTeachers_AB_unique" ON "_CourseTeachers"("A", "B");

-- CreateIndex
CREATE INDEX "_CourseTeachers_B_index" ON "_CourseTeachers"("B");

-- AddForeignKey
ALTER TABLE "_CourseTeachers" ADD CONSTRAINT "_CourseTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseTeachers" ADD CONSTRAINT "_CourseTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
