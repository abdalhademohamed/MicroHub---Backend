import { Injectable } from '@nestjs/common';
import { CreateRootoshDto } from './dto/create-rootosh.dto';
import { UpdateRootoshDto } from './dto/update-rootosh.dto';

@Injectable()
export class RootoshService {
  create(createRootoshDto: CreateRootoshDto) {
    return 'This action adds a new rootosh';
  }

  findAll() {
    return `This action returns all rootosh`;
  }

  findOne(id: number) {
    return `This action returns a #${id} rootosh`;
  }

  update(id: number, updateRootoshDto: UpdateRootoshDto) {
    return `This action updates a #${id} rootosh`;
  }

  remove(id: number) {
    return `This action removes a #${id} rootosh`;
  }
}
