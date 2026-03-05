import { IsString, MinLength, MaxLength } from "class-validator";

export class CreateThreadDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;
}
