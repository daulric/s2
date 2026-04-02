import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { WsAdapter } from '@nestjs/platform-ws';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import fastifyBasicAuth from '@fastify/basic-auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { rawBody: true },
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useWebSocketAdapter(new WsAdapter(app));

  const swaggerUser = process.env.SWAGGER_USER ?? 'admin';
  const swaggerPassword = process.env.SWAGGER_PASSWORD ?? 'changeme';

  const fastify = app.getHttpAdapter().getInstance();

  await fastify.register(fastifyBasicAuth, {
    validate(username, password, _req, _reply, done) {
      if (username === swaggerUser && password === swaggerPassword) {
        done();
      } else {
        done(new Error('Unauthorized'));
      }
    },
    authenticate: { realm: 'S2 API Docs' },
  });

  fastify.addHook('onRequest', (req, reply, done) => {
    if (req.url.startsWith('/docs')) {
      fastify.basicAuth(req, reply, done);
    } else {
      done();
    }
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('s2 api')
    .setDescription('s2 backend api')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`s2 backend listening on :${port}`);
}

bootstrap();
