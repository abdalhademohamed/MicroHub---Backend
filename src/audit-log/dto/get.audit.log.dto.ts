import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum, IsInt } from "class-validator";
import { Transform } from "class-transformer";

export class GetAuditLogsDto {
  @ApiProperty({
    description: "Filter by username",
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: "Filter by email",
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: "Filter by day (YYYY-MM-DD format)",
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  day?: string;

  @ApiProperty({
    description: "Filter by table name",
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiProperty({
    description: "Sort by field",
    required: false,
    default: "timestamp",
    type: String,
    enum: ["timestamp"], // Adjust this enum based on your actual sort fields
  })
  @IsOptional()
  @IsString()
  sortBy: string = "timestamp";

  @ApiProperty({
    description: "Sort order",
    required: false,
    default: "DESC",
    type: String,
    enum: ["ASC", "DESC"],
  })
  @IsOptional()
  @IsEnum(["ASC", "DESC"])
  sortOrder: "ASC" | "DESC" = "DESC";

  @ApiProperty({
    description: "Page number",
    required: false,
    default: "1",
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  page: number = 1;

  @ApiProperty({
    description: "Page size",
    required: false,
    default: "10",
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  limit: number = 10;
}
