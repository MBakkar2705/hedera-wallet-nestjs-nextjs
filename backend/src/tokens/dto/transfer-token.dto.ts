import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferTokenDto {
  @ApiProperty({ example: '0.0.1234', description: 'Sender Hedera Account ID' })
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
    description: 'Recipient Hedera Account ID',
  })
  @IsString()
  toAccountId: string;

  @ApiProperty({ example: '0.0.9999', description: 'Token ID to transfer' })
  @IsString()
  tokenId: string;

  @ApiProperty({
    example: 100,
    description: 'Amount of tokens to transfer',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amount: number;
}
