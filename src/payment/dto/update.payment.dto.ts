import { IsString, Length, IsOptional } from "class-validator";

export class UpdatePaymentDto {
  @IsString()
  @Length(2, 255)
  @IsOptional()
  methodEnglish?: string;

  @IsString()
  @Length(2, 255)
  @IsOptional()
  methodArabic?: string;

  @IsString()
  @IsOptional()
  image?: string; // Optional field for image URL
}
