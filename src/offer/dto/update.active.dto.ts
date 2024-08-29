import { IsBoolean } from 'class-validator';

export class UpdateIsActiveDto {
  @IsBoolean()
  isActive: boolean;
}
