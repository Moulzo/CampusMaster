import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from "@prisma/client";

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @MinLength(2)
    fullName: string;

    @ApiPropertyOptional({ example: 'STUDENT' })
    @IsOptional()
    @IsEnum(Role)
    role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
}