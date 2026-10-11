import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferHbarDto {
  @ApiProperty({ example: '0.0.1234', description: 'Sender Hedera account ID' })
  @IsString()
  fromAccountId: string;

  @ApiProperty({
    example: '302e020100300506032b657004220420...',
    description: 'Sender private key',
  })
  @IsString()
  fromPrivateKey: string;

  @ApiProperty({
    example: '0.0.5678',
    description: 'Recipient Hedera account ID',
  })
  @IsString()
  toAccountId: string;

  @ApiProperty({
    example: 25,
    description: 'Amount of HBAR to transfer',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;
}
