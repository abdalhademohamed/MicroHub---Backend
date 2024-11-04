import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmployeeTypeEntity } from "./entities/employetype.entity";
import { EmployeeEntity } from "../employee/entities/employee.entity";
import { CreateEmployeeTypeDto } from "./dto/create-employetype.dto";
import { UpdateEmployeeTypeDto } from "./dto/update-employetype.dto";
import { CustomI18nService } from "../common/custom.18n.service";

@Injectable()
export class EmployetypeService {
  constructor(
    @InjectRepository(EmployeeTypeEntity)
    private readonly employeeTypeRepository: Repository<EmployeeTypeEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
    private readonly i18n: CustomI18nService,
  ) {}

  async create(
    createEmployeeTypeDto: CreateEmployeeTypeDto,
  ): Promise<EmployeeTypeEntity> {
    const newEmployeeType = this.employeeTypeRepository.create(
      createEmployeeTypeDto,
    );

    try {
      return await this.employeeTypeRepository.save(newEmployeeType);
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate('EMPLOYEE_TYPE.CREATE_FAILED')
      );
    }
  }

  async findAll(): Promise<EmployeeTypeEntity[]> {
    try {
      return await this.employeeTypeRepository.find();
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate('EMPLOYEE_TYPE.RETRIEVE_FAILED')
      );
    }
  }

  async findOne(id: string): Promise<EmployeeTypeEntity> {
    const employeeType = await this.employeeTypeRepository.findOne({
      where: { id },
    });
    
    if (!employeeType) {
      throw new NotFoundException(
        this.i18n.translate('EMPLOYEE_TYPE.NOT_FOUND')
      );
    }
    
    return employeeType;
  }

  async update(
    id: string,
    updateEmployeeTypeDto: UpdateEmployeeTypeDto,
  ): Promise<EmployeeTypeEntity> {
    const employeeType = await this.findOne(id);

    Object.assign(employeeType, updateEmployeeTypeDto);

    try {
      return await this.employeeTypeRepository.save(employeeType);
    } catch (error) {
      throw new InternalServerErrorException(
        this.i18n.translate('EMPLOYEE_TYPE.UPDATE_FAILED')
      );
    }
  }

  async remove(id: string): Promise<void> {
    const employeeType = await this.findOne(id);

    try {
      // Update related employees to remove their reference to the employee type
      await this.employeeRepository.update(
        { employeeType: employeeType },
        { employeeType: null },
      );

      const result = await this.employeeTypeRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(
          this.i18n.translate('EMPLOYEE_TYPE.NOT_FOUND')
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        this.i18n.translate('EMPLOYEE_TYPE.DELETE_FAILED')
      );
    }
  }
}
