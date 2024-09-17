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
    @Query("start_Time") start_Time: Date,
    @Query("end_Time") end_Time: Date,
    @Query("branchId") branchId: string,
  ) {
    return this.analysisService.getRemainingAmountByBranch(
      start_Time,
      end_Time,
      branchId,
    );
  }

  @Get("total-remaining-amount")
  async getTotalRemainingAmount(
    @Query("start_Time") start_Time: Date,
    @Query("end_Time") end_Time: Date,
  ) {
    return this.analysisService.getTotalRemainingAmount(start_Time, end_Time);
  }
  @Get("returned-amount")
  async getTotalReturnedAmount(
    @Query("start_Time") start_Time: Date,
    @Query("end_Time") end_Time: Date,
  ) {
    return this.analysisService.getTotalReturnedMoneyFromCanceledOrdersByTimeRange(
      start_Time,
      end_Time,
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