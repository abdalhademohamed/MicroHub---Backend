import { Controller, Get, Query } from "@nestjs/common";
import { AnalysisService } from "./analysis.service";
import { AnalysisDto } from "./dto/deposit.dto";

@Controller("analysis")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get("all-deposits")
  async getAllDeposits(@Query() query: AnalysisDto) {
    return this.analysisService.getAllDeposits(query);
  }

  @Get("deposits-by-branch")
  async getDepositsByBranch(@Query() query: AnalysisDto) {
    return this.analysisService.getDepositsByBranch(query);
  }

  @Get("remaining-amount-by-branch")
  async getRemainingAmountByBranch(
    @Query("fromDate") fromDate: Date,
    @Query("toDate") toDate: Date,
    @Query("branchId") branchId: string,
  ) {
    return this.analysisService.getRemainingAmountByBranch(
      fromDate,
      toDate,
      branchId,
    );
  }

  @Get("total-remaining-amount")
  async getTotalRemainingAmount(
    @Query("fromDate") fromDate: Date,
    @Query("toDate") toDate: Date,
  ) {
    return this.analysisService.getTotalRemainingAmount(fromDate, toDate);
  }
  @Get("returned-amount")
  async getTotalReturnedAmount(
    @Query("fromDate") fromDate: Date,
    @Query("toDate") toDate: Date,
  ) {
    return this.analysisService.getTotalReturnedMoneyFromCanceledOrdersByTimeRange(
      fromDate,
      toDate,
    );
  }
  @Get("all-prices")
  async getAllPrices() {
    return this.analysisService.getAllPrices();
  }

  @Get("prices-by-method")
  async getPricesGroupedByMethod() {
    return this.analysisService.getPricesGroupedByMethod();
  }
}
