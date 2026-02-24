export class CreateCourseDto {
  title: string;
  description?: string;
  learningModuleId?: string; // ✅ optionnel pour permettre à l'admin d'organiser les matières
}
