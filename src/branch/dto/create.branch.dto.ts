import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ description: 'Branch name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Location URL of the branch' })
  @IsString()
  @IsNotEmpty()
  location: string;  // Ensure this field is included and required

  @ApiProperty({ description: 'Image URL or path' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;  // Ensure this field is included and required
}