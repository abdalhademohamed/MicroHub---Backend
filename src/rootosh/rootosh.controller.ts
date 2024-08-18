import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RootoshService } from './rootosh.service';
import { CreateRootoshDto } from './dto/create-rootosh.dto';
import { UpdateRootoshDto } from './dto/update-rootosh.dto';

@Controller('rootosh')
export class RootoshController {
  constructor(private readonly rootoshService: RootoshService) {}

  // @Post()
  // create(@Body() createRootoshDto: CreateRootoshDto) {
  //   return this.rootoshService.create(createRootoshDto);
  // }

  // @Get()
  // findAll() {
  //   return this.rootoshService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.rootoshService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateRootoshDto: UpdateRootoshDto) {
  //   return this.rootoshService.update(+id, updateRootoshDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.rootoshService.remove(+id);
  // }
}
