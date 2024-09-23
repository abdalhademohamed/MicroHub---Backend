import { ApiProperty } from "@nestjs/swagger";
import { ServiceEntity } from "../../service/entities/service.entity";
import { RootoshEntity } from "../../rootosh/entities/rootosh.entity";

export class GetCustomerDto {
  @ApiProperty({ description: "Unique identifier of the customer" })
  id: string;

  @ApiProperty({ description: "Country code of the customer" })
  country_Code: string;

  @ApiProperty({ description: "Phone number of the customer" })
  phoneNumber: string;

  @ApiProperty({ description: "Full name of the customer" })
  fullName: string;

  @ApiProperty({
    description: "Date of birth of the customer",
    type: String,
    nullable: true,
  })
  dateOfBirth: string; // ISO 8601 string format

  @ApiProperty({ description: "Time remaining until the next birthday" })
  timeUntilBirthday: string;
}
