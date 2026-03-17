import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendPrivateMessageDto {
  @ApiProperty({
    example: 'Bonjour, as-tu vu le dernier devoir ?',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
