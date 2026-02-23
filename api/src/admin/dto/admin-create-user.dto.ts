import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { Role } from "@prisma/client";

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @MinLength(8)
  password: string;
}
