import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateAnnouncementDto {
  @ApiProperty({ example: "Contrôle vendredi" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "Le contrôle aura lieu vendredi à 10h en salle B12." })
  @IsString()
  @IsNotEmpty()
  content: string;
}
