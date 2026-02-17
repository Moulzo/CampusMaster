import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'teacher2@test.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Teacher Two' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'TEACHER', enum: ['STUDENT', 'TEACHER', 'ADMIN'] })
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';

  @ApiPropertyOptional({ example: 'Password123!' })
  password?: string;
}
