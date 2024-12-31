import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUrl,
} from "class-validator";
import { CreateWorkingBranchDto } from "../../working-branch/dto/create.working.branch.dto";

export class CreateBranchDto {
  @ApiProperty({ description: "Branch name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Location URL of the branch" })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: "Invalid URL format for location" })
  location: string;

  @ApiProperty({ description: "Image URL or path" })
  // No validation needed here; it's handled by the file upload mechanism
  image: any; // This will be handled by multer

  @ApiProperty({
    description: "Array of working hours for each day of the week",
    type: [CreateWorkingBranchDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  workingBranch?: CreateWorkingBranchDto[];
}
