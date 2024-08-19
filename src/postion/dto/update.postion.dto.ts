import { PartialType } from '@nestjs/swagger';
import { CreatePositionDto } from './create.postion.dto';

export class UpdatePostionDto extends PartialType(CreatePositionDto) {}
