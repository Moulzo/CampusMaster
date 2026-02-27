import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

export class SetTeachersDto {
  @ApiProperty({ type: [String], example: ["clx_teacher_1", "clx_teacher_2"] })
  @IsArray()
  @IsString({ each: true })
  teacherIds: string[];
}
