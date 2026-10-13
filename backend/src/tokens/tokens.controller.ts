import { TokensService } from './tokens.service';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { CreateTokenDto } from './dto/create-token.dto';
import { AssociateTokenDto } from './dto/associate-token.dto';
import { TransferTokenDto } from './dto/transfer-token.dto';
import { ListTokensQueryDto } from './dto/list-tokens-query.dto';
import { TokenListResponseDto } from './dto/token-list-response.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

@ApiTags('tokens')
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new HTS token on Hedera' })
  @ApiBody({ type: CreateTokenDto })
  @ApiResponse({ status: 201, description: 'Token successfully created' })
  @ApiResponse({ status: 400, description: 'Validation or SDK error' })
  async createToken(@Body() dto: CreateTokenDto) {
    return await this.tokensService.createToken(dto);
  }

  @Post('associate')
  @ApiOperation({ summary: 'Associate a Hedera account with an HTS token' })
  @ApiBody({ type: AssociateTokenDto })
  @ApiResponse({
    status: 201,
    description: 'Token successfully associated to account',
  })
  @ApiResponse({
    status: 400,
    description: 'Association failed or validation error',
  })
  async associateToken(@Body() dto: AssociateTokenDto) {
    return await this.tokensService.associateToken(dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer HTS tokens between accounts' })
  @ApiBody({ type: TransferTokenDto })
  @ApiResponse({ status: 201, description: 'Token successfully transferred' })
  @ApiResponse({
    status: 400,
    description: 'Transfer failed or validation error',
  })
  async transferToken(@Body() dto: TransferTokenDto) {
    return await this.tokensService.transferToken(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List the tokens created by this backend, newest first',
  })
  @ApiResponse({
    status: 200,
    description: 'One page of tokens, with the total number of tokens',
    type: TokenListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid page or limit' })
  async listTokens(
    // transform: true turns the query strings ("2") into numbers. The global
    // pipe validates but does not transform.
    @Query(new ValidationPipe({ transform: true })) query: ListTokensQueryDto,
  ) {
    return await this.tokensService.listTokens(query);
  }
}
