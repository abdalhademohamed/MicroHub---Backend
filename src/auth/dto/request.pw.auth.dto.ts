import { IsEmail, IsString, MinLength, IsNotEmpty } from "class-validator";

export class RequestPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
