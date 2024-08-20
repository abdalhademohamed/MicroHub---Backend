import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateRootoshDto } from './dto/create-rootosh.dto';
import { UpdateRootoshDto } from './dto/update-rootosh.dto';
import { RootoshEntity } from './entities/rootosh.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceEntity } from '../service/entities/service.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RootoshService {
  constructor(
    @InjectRepository(RootoshEntity)
    private readonly rootoshRepository: Repository<RootoshEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
  ) {}


  async createRootosh(createRootoshDto: CreateRootoshDto): Promise<RootoshEntity> {
    const { serviceId, ...rootoshData } = createRootoshDto;

    const service = await this.serviceRepository.findOne({
      where:{id:serviceId}});
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found.`);
    }

    const rootosh = this.rootoshRepository.create({ ...rootoshData, service });

    try {
      return await this.rootoshRepository.save(rootosh);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create rootosh.');
    }



  }

  async findAllRootosh(): Promise<RootoshEntity[]> {
    return this.rootoshRepository.find({ relations: ['service'] });
  }

  async findOneRootosh(id: number): Promise<RootoshEntity> {
    const rootosh = await this.rootoshRepository.findOne({
      where: { id },
      relations: ['service']
    });
    if (!rootosh) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }
    return rootosh;
  }

  async updateRootosh(id: number, updateRootoshDto: UpdateRootoshDto): Promise<RootoshEntity> {
    const rootosh = await this.rootoshRepository.preload({
      id,
      ...updateRootoshDto,
    });

    if (!rootosh) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }

    if (updateRootoshDto.serviceId) {
      const service = await this.serviceRepository.findOne({
        where:{id:updateRootoshDto.serviceId}});
      if (!service) {
        throw new NotFoundException(`Service with ID ${updateRootoshDto.serviceId} not found.`);
      }
      rootosh.service = service;
    }

    try {
      return await this.rootoshRepository.save(rootosh);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update rootosh.');
    }
  }

  async removeRootosh(id: number): Promise<void> {
    const result = await this.rootoshRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }
  }
}
