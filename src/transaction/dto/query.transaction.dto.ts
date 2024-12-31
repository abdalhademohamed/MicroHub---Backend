import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from "class-validator";
import { Transform } from "class-transformer";

export class FindTransactionDto {
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
  branch?: string;

  @IsOptional()
  @IsString()
  fromDate?: string; // Format: 'yyyy-MM-dd'

  @IsOptional()
  @IsString()
  toDate?: string; // Format: 'yyyy-MM-dd'

  @IsOptional()
  @IsString()
  payment?: string; // New property to filter by specific service
}
