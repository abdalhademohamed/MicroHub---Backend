// comment-response.dto.ts
export class ReviewResponseDto {
    id: string;
    rating: number;
    createdAt: Date;
    imageOrder: string;
    commentBefore?: string;
    commentAfter?: string;
    reviewer: {
      id: string;
      image:string,
      username: string;
      english_Name: string;
      role: string;
      phoneNumber: string;
    } | null;
    artist: {
      id: string;
      image:string,
      username: string;
      english_Name: string;
      role: string;
      phoneNumber: string;
    } | null;
  }
  
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
  