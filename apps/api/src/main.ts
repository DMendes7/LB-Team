import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { AppModule } from "./app.module";

const uploadDirs = [join(process.cwd(), "uploads"), join(process.cwd(), "uploads", "exercises")];
for (const d of uploadDirs) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/files/" });
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`API http://localhost:${port}`);
}

bootstrap();
