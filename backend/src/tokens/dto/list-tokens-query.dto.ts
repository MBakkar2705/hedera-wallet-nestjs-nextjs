import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListTokensQueryDto {
  @ApiPropertyOptional({
    type: 'integer',
    example: 1,
    default: 1,
    minimum: 1,
    description: 'Page number, starting at 1',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: 'integer',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Number of tokens per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
