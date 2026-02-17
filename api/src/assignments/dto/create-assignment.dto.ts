export class CreateAssignmentDto {
  title: string;
  description?: string;
  dueDate: string; // ISO string
  courseId: string;
}
