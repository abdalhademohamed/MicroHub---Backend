import { ApiProperty } from '@nestjs/swagger';
import { PositionEntity } from '../../postion/entities/postion.entity';

export class UserProfileDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ nullable: true })
  image: string | null;

  @ApiProperty({ type: () => PositionEntity, nullable: true })
  position: PositionEntity | null; // Use PositionEntity and handle nullability
}
