import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({
    example: 10,
    description: 'Initial HBAR balance for the new account',
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @Min(0)
  initialBalance!: number;
}
