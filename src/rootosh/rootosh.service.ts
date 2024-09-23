import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateRootoshDto } from "./dto/create-rootosh.dto";
import { UpdateRootoshDto } from "./dto/update-rootosh.dto";
import { RootoshEntity } from "./entities/rootosh.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ServiceEntity } from "../service/entities/service.entity";
import { Repository } from "typeorm";

@Injectable()
export class RootoshService {
  constructor(
    @InjectRepository(RootoshEntity)
    private readonly rootoshRepository: Repository<RootoshEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
  ) {}

  async createRootosh(
    createRootoshDto: CreateRootoshDto,
  ): Promise<RootoshEntity> {
    const { serviceId, ...rootoshData } = createRootoshDto;

    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found.`);
    }

    const rootosh = this.rootoshRepository.create({ ...rootoshData, service });

    try {
      return await this.rootoshRepository.save(rootosh);
    } catch (error) {
      throw new InternalServerErrorException("Failed to create rootosh.");
    }
  }

  async findAllRootosh(
    page: number,
    limit: number,
  ): Promise<{
    data: RootoshEntity[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const [data, total] = await this.rootoshRepository.findAndCount({
      relations: ["service"],
      skip: (page - 1) * limit,
      take: limit,
    });

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      lastPage,
    };
  }
  async findOneRootosh(id: string): Promise<RootoshEntity> {
    const rootosh = await this.rootoshRepository.findOne({
      where: { id },
      relations: ["service"],
    });
    if (!rootosh) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }
    return rootosh;
  }

  async findOneRootoshByServiceId(serviceId: string): Promise<RootoshEntity> {
    const rootosh = await this.rootoshRepository.findOne({
      where: {
        service: { id: serviceId },
      },
      relations: ["service"], // Ensure that the related 'service' is included
    });

    if (!rootosh) {
      throw new NotFoundException(
        `Rootosh associated with service ID ${serviceId} not found.`,
      );
    }

    return rootosh;
  }
  async updateRootosh(
    id: string,
    updateRootoshDto: UpdateRootoshDto,
  ): Promise<RootoshEntity> {
    const rootosh = await this.rootoshRepository.preload({
      id,
      ...updateRootoshDto,
    });

    if (!rootosh) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }

    if (updateRootoshDto.serviceId) {
      const service = await this.serviceRepository.findOne({
        where: { id: updateRootoshDto.serviceId },
      });
      if (!service) {
        throw new NotFoundException(
          `Service with ID ${updateRootoshDto.serviceId} not found.`,
        );
      }
      rootosh.service = service;
    }

    try {
      return await this.rootoshRepository.save(rootosh);
    } catch (error) {
      throw new InternalServerErrorException("Failed to update rootosh.");
    }
  }

  async removeRootosh(id: string): Promise<void> {
    const result = await this.rootoshRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Rootosh with ID ${id} not found.`);
    }
  }
}
