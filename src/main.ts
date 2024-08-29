import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { useNestTreblle } from "treblle";
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // Apply validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    })
  );
  const configService = app.get<ConfigService>(ConfigService);
  const expressInstance = app.getHttpAdapter().getInstance();
  useNestTreblle(expressInstance, {
    apiKey: configService.get<string>('TREBLLE_API_KEY'),
    projectId: configService.get<string>('TREBLLE_PROJECT_ID'),
  });
 
  const config = new DocumentBuilder()
    .setTitle("EASY-BOOK-API")
    .setDescription("the description of the api")
    .setVersion("1.0")
    .build();
  // const Document= SwaggerModule.createDocument(app,config)
  // SwaggerModule.setup('/DOC',app,Document)

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/swagger", app, document, {
    customCssUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
    customJs: [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js",
    ],
  });
  await app.listen(3000);
}
bootstrap();
