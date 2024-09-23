import { IsEmail, IsString, MinLength, IsNotEmpty } from "class-validator";

export class RequestPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  // @IsString()
  // @IsNotEmpty()
  // resetToken: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  newPassword: string;
}
