import { ApiProperty } from "@nestjs/swagger";
import { PositionEntity } from "../../postion/entities/postion.entity";
import { BranchEntity } from "../../branch/entities/branch.entity";

export class ReviewDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  comment_Before: string;

  @ApiProperty()
  comment_After: string;

  @ApiProperty()
  orderFirstTime: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class GetUserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ nullable: true })
  image: string | null;

  @ApiProperty({ type: () => PositionEntity })
  position: PositionEntity;

  @ApiProperty({ type: () => BranchEntity })
  branch: BranchEntity;

  @ApiProperty()
  workingHours: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  oldestAvgRating: number;

  @ApiProperty()
  newestAvgRating: number;

  // @ApiProperty({ type: [ReviewDto] })
  // reviews: ReviewDto[];
}
