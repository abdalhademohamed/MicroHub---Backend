import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class GetNearestSlot {
  @ApiProperty()
  @IsString()
  branch: string;

  @ApiProperty({
    example: "service 1 id,service 2 id, service 3 id,service 4 id",
  })
  @IsString()
  @IsOptional()
  services: string;

  @IsString()
  @IsOptional()
  rootosh: string;
}
