import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class SendNotificationDto {
  @ApiProperty({
    description: "The title of the notification",
    example: "System Alert",
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: "The message content of the notification",
    example: "Your password has been successfully updated.",
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
