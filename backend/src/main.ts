import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { enableAppCors } from './cors';
import { getPort } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  enableAppCors(app);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Hedera Wallet API by M.Bakkar')
    .setDescription('Backend minimalist for Hedera wallet operations')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(getPort(), '0.0.0.0');
}
void bootstrap();
