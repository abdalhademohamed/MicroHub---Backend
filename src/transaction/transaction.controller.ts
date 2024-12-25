import { Controller, Get, Param } from "@nestjs/common";
import { TransactionService } from "./transaction.service";

@Controller('transaction')
export class TransactionController {
    constructor(private transactionService: TransactionService){}
    @Get(':order')
    getAllTransactions(@Param('order') order: string) {
        return this.transactionService.getAllTransactionsToOrder(order);
    }
}