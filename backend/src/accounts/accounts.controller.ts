import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { TransferHbarDto } from './dto/transfer-hbar.dto';
import { AccountInfoResponseDto } from './dto/account-info-response.dto';
import { TransferHbarResponseDto } from './dto/transfer-hbar-response.dto';
import {
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Hedera account on testnet' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({ status: 200, description: 'Account successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  create(@Body() { initialBalance }: CreateAccountDto) {
    return this.accountsService.createAccount(initialBalance);
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get Hedera account info (balance, tokens, key)' })
  @ApiParam({
    name: 'accountId',
    type: String,
    description: 'Hedera account ID to retrieve info for',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Hedera account info and balance',
    type: AccountInfoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Malformed account ID' })
  @ApiResponse({ status: 404, description: 'Unknown account ID' })
  getAccountInfo(@Param('accountId') id: string) {
    return this.accountsService.getAccountInfo(id);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer HBAR between Hedera accounts' })
  @ApiBody({ type: TransferHbarDto })
  @ApiResponse({
    status: 201,
    description: 'Transfers HBAR from source to destination account',
    type: TransferHbarResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Hedera rejected the transfer (for example insufficient balance) or an ID is malformed',
  })
  transfer(@Body() dto: TransferHbarDto) {
    return this.accountsService.transferHbar(dto);
  }
}
