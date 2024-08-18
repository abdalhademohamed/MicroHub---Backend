import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Roles } from '../utils/user.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {

  @ApiProperty({ description: 'The username of the user' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  readonly username: string;

  @ApiProperty({ description: 'The email of the user' })
  @IsEmail()
  readonly email: string;


  @ApiProperty({ description: 'The phone of the user' })
  @IsOptional()
  // @IsPhoneNumber(null, { message: 'Invalid phone number format' })
  readonly phone?: string; // Optional phone number field

  @ApiProperty({ description: 'The password of the user' })
  @MinLength(4)
  @IsString()
  // @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
  //     message: 'password is too weak',
  // })
  readonly password: string;


  @ApiProperty({ description: 'The role of the user' })
  @IsEnum(Roles, { message: 'Role must be either ADMIN, USER, etc.' })
  readonly role: Roles;

  readonly resetCode?: string;
}
