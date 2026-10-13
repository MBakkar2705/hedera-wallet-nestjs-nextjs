import { ApiProperty } from '@nestjs/swagger';

export class TransferHbarResponseDto {
  @ApiProperty({ example: 'SUCCESS', description: 'Status of the receipt' })
  status: string;

  @ApiProperty({
    example: '0.0.10937780@1791480449.935752603',
    description: 'ID of the transaction',
  })
  transactionId: string;

  @ApiProperty({ example: '0.0.10937780', description: 'Sender account ID' })
  from: string;

  @ApiProperty({ example: '0.0.10937901', description: 'Recipient account ID' })
  to: string;

  @ApiProperty({
    example: '1 ℏ',
    description:
      'Formatted amount with its unit. Kept for compatibility: prefer "value" and "unit".',
  })
  amount: string;

  @ApiProperty({ example: 1, description: 'Amount transferred, as a number' })
  value: number;

  @ApiProperty({ example: 'HBAR', description: 'Unit of "value"' })
  unit: string;
}
