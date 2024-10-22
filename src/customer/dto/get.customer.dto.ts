import { ApiProperty } from "@nestjs/swagger";

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
  dateOfBirth?: string; // ISO 8601 string format or null

  @ApiProperty({
    description: "Time remaining until the next birthday",
    nullable: true,
  })
  timeUntilBirthday?: string; // Time until next birthday or null

  @ApiProperty({
    description: "List of last services availed by the customer",
    type: [Object],
    nullable: true,
  })
  lastServices?: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>; // Array of service details

  @ApiProperty({
    description: "List of last rootoshes availed by the customer",
    type: [Object],
    nullable: true,
  })
  lastRootoshes?: Array<{
    id: string;
    english_Name: string;
    arabic_Name:string
    expirationDuration:number
    expirationDate:Date
    duration:number
    description: string;
    // serviceEnglishName:string
    // serviceArabicName:string
  }>; // Array of rootosh details

  @ApiProperty({
    description: "List of reservations made by the customer",
    type: [Object],
    nullable: true,
  })
  reservations?: Array<{
    id: string;
    reservationDate: string; // ISO 8601 string format
    services: Array<{
      id: string;
      name: string;
      duration: number;
      price: number;
    }>; // Array of service details
  }>;

  @ApiProperty({
    description: "List of orders made by the customer",
    type: [Object],
    nullable: true,
  })
  orders?: Array<{
    id: string;
    date: string; // ISO 8601 string format
  }>;

  @ApiProperty({ description: "Count of orders for the customer" })
  orderCount?: number; // Count of orders


  rootoshesexpirationDate?:Date
}
