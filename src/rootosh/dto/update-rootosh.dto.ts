import { PartialType } from '@nestjs/swagger';
import { CreateRootoshDto } from './create-rootosh.dto';

export class UpdateRootoshDto extends PartialType(CreateRootoshDto) {}
