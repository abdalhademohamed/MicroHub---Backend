import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";

export class AvailableQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    page: number;
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    limit: number;
}