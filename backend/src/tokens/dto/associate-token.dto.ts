import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssociateTokenDto {
  @ApiProperty({
    example: '0.0.1234',
    description: 'Hedera Account ID to associate the token with',
  })
  @IsString()
  accountId!: string;

  @ApiProperty({
    example: '302e020100300506032b657004220420...',
    description:
      'Private key of the target account: DER, or 64 hexadecimal characters (the key type is then read from the account on Hedera)',
  })
  @IsString()
  privateKey!: string;

  @ApiProperty({
    example: '0.0.5678',
    description: 'Token ID to be associated',
  })
  @IsString()
  tokenId!: string;
}
