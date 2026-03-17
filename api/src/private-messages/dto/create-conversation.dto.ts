import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    example: ['cmxxxxxxxxxxxxxx1'],
    description: 'IDs des autres participants à la conversation privée',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantIds: string[];
}
