import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useWebSocketAdapter(new WsAdapter(app));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`s2 backend listening on :${port}`);
}

bootstrap();
