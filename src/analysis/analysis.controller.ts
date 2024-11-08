import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AnalysisService } from "./analysis.service";
import { AnalysisDto } from "./dto/deposit.dto";
import { ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { OfferReportDto } from "./dto/get.offer.report.dto";
import { SharableOfferReportDto } from "./dto/get.sharable.offer.report.dto";
import { GetServiceReportDto } from "./dto/get.service.report.dto";
import { GetPaymentMethodReportDto } from "./dto/get.payment.report.dto";
import { GenerateOrderReportDto } from "./dto/get.orders.report.dto";
import { GetTotalDepositsDto } from "./dto/get.total.depost.branch.dto";
import { GetTotalRefundsDto } from "./dto/get.total.branch.refund.dto";
import { RolesGuard } from "../auth/guards/role.guards";
import { Role } from "../user/utils/user.enum";
import { Roles } from "../auth/Roles.decorator";
import { AccessTokenGuard } from "../auth/guards/accessToken.guard";

@Controller("analysis")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}


  /* -------------------------------------------------------------------------- */
  /*                                   offers                                   */
  /* -------------------------------------------------------------------------- */
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
  @Get('offer')
  @ApiResponse({ status: 200, description: 'Retrieve offers report' })
  async getOfferReport(@Query() filterDto: OfferReportDto) {
    return this.analysisService.getOfferReport(filterDto);
  }


/* -------------------------------------------------------------------------- */
/*                                  services                                  */
/* -------------------------------------------------------------------------- */
@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
@Get('service')
async getServiceReport(@Query() GetServiceReportDto: GetServiceReportDto) {
  return this.analysisService.getServiceReport(GetServiceReportDto);
}





/* -------------------------------------------------------------------------- */
/*                                 Reservation                                */
/* -------------------------------------------------------------------------- */

@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
  @Get('reservation')
  @ApiOperation({ summary: 'Get report for reservations' })
  @ApiQuery({ name: 'fromData', required: false, description: 'Optional start date for filtering reservations' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Optional end date for filtering reservations' })
  async getReservationReport(
    @Query('fromData') fromData?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.analysisService.getReservationReport(
      fromData ? new Date(fromData) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }


/* -------------------------------------------------------------------------- */
/*                               Sharable Offers                              */
/* -------------------------------------------------------------------------- */


@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
@Get('sharable/offer')
@ApiResponse({ status: 200, description: 'Retrieve sharable offers report' })
async getSharableOfferReport(@Query() filterDto: SharableOfferReportDto) {
  return this.analysisService.getSharableOfferReport(filterDto);
}


/* -------------------------------------------------------------------------- */
/*                                   Payment                                  */
/* -------------------------------------------------------------------------- */

// @Get('payment')
// async getPaymentMethodReport(
//   @Query() query: GetPaymentMethodReportDto,
// ): Promise<any> {
//   return this.analysisService.getPaymentMethodReport(query);
// }
@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
@Get('payment')
@ApiOperation({ summary: 'Get payment method usage report' })
@ApiResponse({ status: 200, description: 'Payment method usage report generated successfully.' })
@ApiResponse({ status: 500, description: 'Internal server error.' })
async getPaymentMethodUsageReport(   
@Query('fromDate') fromDate?: string, // Optional fromDate
@Query('toDate') toDate?: string,     // Optional toDate
@Query('branchId') branchId?: string   ) {
  // Call the service method to get the report
  // Convert string dates to Date objects
  const from = fromDate ? new Date(fromDate) : undefined;
  const to = toDate ? new Date(toDate) : undefined;
  return await this.analysisService.getPaymentMethodUsageReport(from,to,branchId);
}



@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT,Role.COORDINATOR)
@Get('order')
async getOrderReport(    @Query() query: GenerateOrderReportDto,
) {
  return await this.analysisService.generateOrderReport(query);

}

/* -------------------------------------------------------------------------- */
/*                                  Employee                                  */
/* -------------------------------------------------------------------------- */
@UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
@Get('employee')
  async getCoordinatorReceptionistOrderReport(
    @Query('fromDate') fromDate?: string, // Optional fromDate
    @Query('toDate') toDate?: string,     // Optional toDate
    @Query('employeeId') userId?: string,       // Optional userId
    @Query('branchId') branchId?: string       // Optional userId

  ) {
    // Convert string dates to Date objects
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    return this.analysisService.getCoordinatorReceptionistOrderReport(from, to, userId,branchId);
  }




  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
  @Get('count')
  async getCounts() {
    return this.analysisService.getCount();
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT,Role.ARTISTMANAGER)
  @Get('total/deposit')
  async getTotalDeposits(@Query() dto: GetTotalDepositsDto, ) {
    
    return await this.analysisService.getTotalDepositsByBranch(dto);
    
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
  @Get('total/refund')
  async getTotalRefunds(@Query() dto: GetTotalRefundsDto, ) {
   return await this.analysisService.getTotalRefunds(dto);

  }
  
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
  @Get("all-prices")
  async getAllPrices() {
    return this.analysisService.getAllPrices();
  }
  @UseGuards(AccessTokenGuard, RolesGuard) // Ensure AccessTokenGuard is first
  @Roles(Role.SUPERADMIN, Role.BRANCHMANAGER,Role.ACCOUNTANT)
  @Get("prices-by-method")
  async getPricesGroupedByMethod() {
    return this.analysisService.getPricesGroupedByMethod();
  }
}
