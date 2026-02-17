export class CreateAssignmentDto {
  title: string;
  description?: string;
  dueDate: string; // ISO string
  maxScore?: number;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  courseId: string;
}
