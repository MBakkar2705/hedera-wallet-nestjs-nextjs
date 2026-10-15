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

export class AccountKeyDto {
  @ApiProperty({
    enum: ['ED25519', 'secp256k1'],
    example: 'ED25519',
    description: 'Type of the public key of the account',
  })
  type!: string;

  @ApiProperty({
    example: '4a5b6c7d8e9f00112233445566778899aabbccddeeff00112233445566778899',
    description:
      'Public key as raw hexadecimal (not DER). A client can compare it with the public key computed from a private key.',
  })
  publicKey!: string;
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

  @ApiProperty({
    type: AccountKeyDto,
    nullable: true,
    description:
      'Public key of the account when it is a single key, so that a client can check that a private key belongs to the account. null when the key is a list of keys, a threshold key or a contract key.',
  })
  key!: AccountKeyDto | null;
}
