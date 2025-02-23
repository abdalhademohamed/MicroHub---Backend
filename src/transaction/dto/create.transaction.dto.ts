export class CreateTransactionDto {
  paymentId: string;
  orderId: string;
  amount: number;
  userId: string;
  type: string;
}
