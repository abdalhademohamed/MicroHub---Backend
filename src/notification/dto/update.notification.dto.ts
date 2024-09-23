import { PartialType } from "@nestjs/swagger";
import { SendNotificationDto } from "./send.notification.dto";

export class UpdateNotificationDto extends PartialType(SendNotificationDto) {}
