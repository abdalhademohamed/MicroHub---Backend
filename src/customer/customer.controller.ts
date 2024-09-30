import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { CreateCustomerDto } from "./dto/create.customer.dto";
import { UpdateCustomerDto } from "./dto/update.customer.dto";
import { GetCustomerDto } from "./dto/get.customer.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("customer")
@Controller("customer")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}




  @Get('count')
  async getCustomerCount(): Promise<{ count: number }> {
    const count = await this.customerService.countCustomers();
    return { count };
  }
  
  @Get(":phoneNumber")
  async getCustomerByPhoneNumber(
    @Param("phoneNumber") phoneNumber: string,
  ): Promise<GetCustomerDto> {
    try {
      const customer =
        await this.customerService.getCustomerByPhoneNumber(phoneNumber);
      if (!customer) {
        throw new NotFoundException(
          `Customer with phone number ${phoneNumber} not found.`,
        );
      }
      return customer;
    } catch (error) {
      console.error("Error in getCustomerByPhoneNumber:", {
        message: error.message,
        stack: error.stack,
        phoneNumber,
      });
      throw new InternalServerErrorException("An unexpected error occurred");
    }
  }
}
