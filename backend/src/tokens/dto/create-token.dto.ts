import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTokenDto {
  @ApiProperty({ example: 'MyToken', description: 'Name of the token' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'MTK', description: 'Symbol of the token' })
  @IsString()
  symbol: string;

  @ApiProperty({
    example: 1000,
    description: 'Initial supply of the token',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  initialSupply: number;
}
