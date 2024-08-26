import { IsNumber, IsString } from 'class-validator';

export class RefreshTokenDto {

  @IsString()
  refreshToken: string;
}