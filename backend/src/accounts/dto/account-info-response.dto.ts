import { ApiProperty } from '@nestjs/swagger';

export class AccountBalanceDto {
  @ApiProperty({
    example: '3.99888384',
    description: 'HBAR balance as an exact decimal string, without a symbol',
  })
  hbar!: string;

  @ApiProperty({
    example: '399888384',
    description: 'The same balance in tinybars (1 HBAR = 100,000,000 tinybars)',
  })
  tinybars!: string;
}

export class AccountTokenDto {
  @ApiProperty({ example: '0.0.123456', description: 'Token ID' })
  tokenId!: string;

  @ApiProperty({ example: 'MTK', description: 'Symbol of the token' })
  symbol!: string;

  @ApiProperty({
    example: '10',
    description:
      'Balance of the account in the smallest unit of the token, as a string (the number of decimals of the token is not part of this response)',
  })
  balance!: string;
}

export class AccountInfoResponseDto {
  @ApiProperty({ example: '0.0.10936687', description: 'Hedera account ID' })
  accountId!: string;

  @ApiProperty({
    example: '1 ℏ',
    description:
      'Formatted balance with its unit. Kept for compatibility: prefer "balance".',
  })
  hbarBalance!: string;

  @ApiProperty({
    type: [String],
    example: ['0.0.123456'],
    description:
      'IDs of the associated tokens. Kept for compatibility: prefer "tokens".',
  })
  tokenAssociations!: string[];

  @ApiProperty({ type: AccountBalanceDto })
  balance!: AccountBalanceDto;

  @ApiProperty({
    type: [AccountTokenDto],
    description: 'Associated tokens, with their symbol and the account balance',
  })
  tokens!: AccountTokenDto[];
}
