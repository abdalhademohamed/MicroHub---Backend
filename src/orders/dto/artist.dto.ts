import { ApiProperty } from '@nestjs/swagger';

export class ArtistDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  englishName: string;

  @ApiProperty()
  arabicName: string;

  @ApiProperty()
  workingHours: number;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  image: string;

  @ApiProperty()
  oldestAvgRating: number;

  @ApiProperty()
  newestAvgRating: number;

  @ApiProperty()
  position: string; // Adjust if necessary
}
