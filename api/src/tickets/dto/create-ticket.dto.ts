import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TicketType } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  description: string;

  @IsEnum(TicketType)
  type: TicketType;
}
