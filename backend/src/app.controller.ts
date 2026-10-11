import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Default API route – verifies backend is reachable',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a basic confirmation string',
  })
  getHello(): string {
    // return 'Welcome to Hedera Wallet API by M. Bakkar';
    return this.appService.getHello();
  }
}
