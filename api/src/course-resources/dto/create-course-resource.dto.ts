import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateCourseResourceDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
