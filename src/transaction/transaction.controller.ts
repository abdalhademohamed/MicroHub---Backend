import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { FindTransactionDto } from "./dto/query.transaction.dto";
import { Response } from "express";

@Controller("transaction")
export class TransactionController {
  constructor(private transactionService: TransactionService) {}
  @Get()
  async getTransaction(@Query() obj: FindTransactionDto) {
    return this.transactionService.latestTransaction(obj);
  }
  @Get("income")
  async incomeTransaction(@Query() obj: FindTransactionDto) {
    return this.transactionService.incomeAggregations(obj);
  }
  @Get("refund")
  async refundTransaction(@Query() obj: FindTransactionDto) {
    return this.transactionService.refundAggregations(obj);
  }
  @Get("employee")
  async aggregations(@Query() obj: FindTransactionDto) {
    return this.transactionService.incomeAndRefundAggregations(obj);
  }
  @Get("statistics")
  async getStatisticsWithDetails(@Query() obj: FindTransactionDto) {
    return this.transactionService.getPaymentStatisticsWithDetails(obj);
  }
  @Get("statistics-file")
  async getStatisticsWithExcel(
    @Res() res: Response,
    @Query("file") file: string,
    @Query() obj: FindTransactionDto,
  ) {
    try {
      return this.transactionService.getPaymentStaticesExcel(obj, res, file);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Error export file" });
    }
  }
  @Get("employee-file")
  async aggregationsExcel(
    @Query() obj: FindTransactionDto,
    @Res() res: Response,
    @Query("file") file: string,
  ) {
    return this.transactionService.incomeAndRefundAggregationsExcel(
      obj,
      res,
      file,
    );
  }
  @Get("refund-income-file")
  async refundTransactionExcel(
    @Query() obj: FindTransactionDto,
    @Res() res: Response,
    @Query("file") file: string,
  ) {
    return this.transactionService.refundIncomeExcel(obj, res, file);
  }
  @Get("transaction-file")
  async getTransactionExcel(
    @Query() obj: FindTransactionDto,
    @Res() res: Response,
    @Query("file") file: string,
  ) {
    return this.transactionService.latestTransactionExcel(obj, res, file);
  }
}
