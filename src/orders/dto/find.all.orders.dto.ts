import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from "class-validator";
import { Transform } from "class-transformer";

export class FindOrdersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sort?: "asc" | "desc" = "asc";

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  employeeName?: string;
}
