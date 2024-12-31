import { ReviewResponseDto } from "../../comment/dto/get.comment.response.dto";

export class CommentResponseDto {
  id: string;
  content: string;
  imageBeforeUrl: string;
  imageAfterUrl: string;
  createdAt: Date;

  employee: {
    id: string;
    username: string;
    email: string;
    role: string;
    english_Name: string;
    arabic_Name: string;
    workingHours: string;
    phoneNumber: string;
    image: string;
    available: boolean;
    totalReviews: number;
    status: string;
    oldestAvgRating: number;
    newestAvgRating: number;
  } | null;

  reviews: ReviewResponseDto[];
}
