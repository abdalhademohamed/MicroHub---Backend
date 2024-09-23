import { IsString, Length } from "class-validator";

export class CreatePaymentDto {
  @IsString()
  @Length(2, 255)
  methodEnglish: string;

  @IsString()
  @Length(2, 255)
  methodArabic: string;
}
