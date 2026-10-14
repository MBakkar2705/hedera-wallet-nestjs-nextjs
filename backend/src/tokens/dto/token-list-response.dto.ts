import { ApiProperty } from '@nestjs/swagger';

export class TokenListItemDto {
  @ApiProperty({ example: '0.0.123456', description: 'Token ID' })
  tokenId!: string;

  @ApiProperty({ example: 'MyToken', description: 'Name of the token' })
  name!: string;

  @ApiProperty({ example: 'MTK', description: 'Symbol of the token' })
  symbol!: string;

  @ApiProperty({
    example: 1000,
    description: 'Initial supply given when the token was created',
  })
  initialSupply!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-13T09:00:00.000Z',
    description: 'When the token was saved by this backend',
  })
  createdAt!: Date;
}

export class TokenListResponseDto {
  @ApiProperty({
    type: [TokenListItemDto],
    description: 'The tokens of the page, newest first',
  })
  items!: TokenListItemDto[];

  @ApiProperty({ example: 1, description: 'Page number, starting at 1' })
  page!: number;

  @ApiProperty({
    example: 20,
    description: 'Maximum number of tokens per page',
  })
  limit!: number;

  @ApiProperty({
    example: 42,
    description: 'Number of tokens saved by this backend, all pages together',
  })
  total!: number;
}
