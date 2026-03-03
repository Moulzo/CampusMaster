import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class SetStudentModuleDto {
  @ApiProperty({ required: false, nullable: true, type: String })
  @IsOptional() // ✅ autorise absence OU null
  @IsString()
  learningModuleId?: string | null;
}
