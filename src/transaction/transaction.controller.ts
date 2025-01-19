import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { FindTransactionDto } from "./dto/query.transaction.dto";
import { Response } from "express";

@Controller("transaction")
export class TransactionController {
  constructor(private transactionService: TransactionService) {}
  @Get()
  async getTransaction(@Query() obj: FindTransactionDto){
    return this.transactionService.latestTransaction(obj);
  }
  @Get('income')
  async incomeTransaction(@Query() obj: FindTransactionDto){
    return this.transactionService.incomeAggregations(obj);
  }
  @Get('refund')
  async refundTransaction(@Query() obj: FindTransactionDto){
    return this.transactionService.refundAggregations(obj);
  }
  @Get('employee')
  async aggregations(@Query() obj: FindTransactionDto){
    return this.transactionService.incomeAndRefundAggregations(obj);
  }
  @Get('statistics')
  async getStatisticsWithDetails() {
    return this.transactionService.getPaymentStatisticsWithDetails();
  }
  @Get('statistics-excel')
  async getStatisticsWithExcel() {
    return this.transactionService.getPaymentStaticesExcel();
  }
  @Get('employee-excel')
  async aggregationsExcel(@Query() obj: FindTransactionDto){
    return this.transactionService.incomeAndRefundAggregationsExcel(obj);
  }
  @Get('refund-income-excel')
  async refundTransactionExcel(@Query() obj: FindTransactionDto){
    return this.transactionService.refundIncomeExcel(obj);
  }
  @Get('transaction-excel')
  async getTransactionExcel(@Query() obj: FindTransactionDto){
    return this.transactionService.latestTransactionExcel(obj);
  }
}
