import { PartialType } from '@nestjs/swagger';
import { CreateSharableOfferDto } from './create-sharable-offer.dto';

export class UpdateSharableOfferDto extends PartialType(CreateSharableOfferDto) {}
