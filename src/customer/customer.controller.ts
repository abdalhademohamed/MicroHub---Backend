import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { GetCustomerDto } from "./dto/get.customer.dto";
import { ApiTags } from "@nestjs/swagger";
import { GetCustomerPaginatedsDto } from "./dto/get.customers.paginated.dto";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";
import { RolesGuard } from "../auth/guards/role.guards";
import { Role } from "../user/utils/user.enum";
import { Roles } from "../auth/Roles.decorator";

@ApiTags("customer")
@Controller("customer")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ACCOUNTANT,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  @Get("sorted")
  async getCustomers(@Query() filters: GetCustomerPaginatedsDto) {
    return this.customerService.getAllCustomers(filters);
  }
  @UseGuards(AccessTokenGuard) // Ensure AccessTokenGuard is first
  @Get("search")
  async getCustomerSearch(@Query("keyword") keyword: string) {
    return this.customerService.findOrdersAndCustomersByKeyword(keyword);
  }
  @Get("count")
  async getCustomerCount(): Promise<{ count: number }> {
    const count = await this.customerService.countCustomers();
    return { count };
  }

  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(
    Role.SUPERADMIN,
    Role.COORDINATOR,
    Role.RECEPTIONIST,
    Role.ACCOUNTANT,
    Role.ARTISTMANAGER,
    Role.ADMIN,
  )
  @Get(":phoneNumber")
  async getCustomerByPhoneNumber(
    @Param("phoneNumber") phoneNumber: string,
  ): Promise<GetCustomerDto> {
    const customer =
      await this.customerService.getCustomerByPhoneNumber(phoneNumber);
    if (!customer) {
      throw new NotFoundException(
        `Customer with phone number ${phoneNumber} not found.`,
      );
    }
    return customer;
  }
}
