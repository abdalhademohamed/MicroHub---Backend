import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ description: 'The email of the user', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The OTP code sent to the user', example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}