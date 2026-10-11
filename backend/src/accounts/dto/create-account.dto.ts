import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({
    example: 10,
    description: 'Initial HBAR balance for the new account',
    minimum: 0,
    type: Number,
  })
  initialBalance: number;
}
