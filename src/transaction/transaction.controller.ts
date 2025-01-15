import { Controller, Get, Param, Query } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { FindTransactionDto } from "./dto/query.transaction.dto";

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
}
