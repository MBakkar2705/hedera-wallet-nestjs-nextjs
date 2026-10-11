import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { TransferHbarDto } from './dto/transfer-hbar.dto';
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
  create(@Body() { initialBalance }: CreateAccountDto) {
    return this.accountsService.createAccount(initialBalance);
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get Hedera account info (balance + tokens)' })
  @ApiParam({
    name: 'accountId',
    type: String,
    description: 'Hedera account ID to retrieve info for',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Hedera account info and balance',
  })
  getAccountInfo(@Param('accountId') id: string) {
    return this.accountsService.getAccountInfo(id);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer HBAR between Hedera accounts' })
  @ApiBody({ type: TransferHbarDto })
  @ApiResponse({
    status: 200,
    description: 'Transfers HBAR from source to destination account',
  })
  transfer(@Body() dto: TransferHbarDto) {
    return this.accountsService.transferHbar(dto);
  }
}
