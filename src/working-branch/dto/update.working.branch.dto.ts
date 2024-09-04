import { PartialType } from '@nestjs/swagger';
import { CreateWorkingBranchDto } from './create.working.branch.dto';

export class UpdateWorkingBranchDto extends PartialType(CreateWorkingBranchDto) {}
