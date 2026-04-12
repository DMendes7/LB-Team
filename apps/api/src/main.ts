import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { AppModule } from "./app.module";

const uploadDirs = [join(process.cwd(), "uploads"), join(process.cwd(), "uploads", "exercises")];
for (const d of uploadDirs) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

/** CORS explícito em /files — o front (outro domínio) pede o MP4 na API; sem isso o preview do vídeo pode ficar cinza. */
function corsForUploadedFiles(req: Request, res: Response, next: NextFunction) {
  const allowed =
    process.env.FRONTEND_URL?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (allowed.length === 1) {
    res.setHeader("Access-Control-Allow-Origin", allowed[0]);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use("/files", corsForUploadedFiles);
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/files/" });
  const corsOrigins = process.env.FRONTEND_URL?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : ["http://localhost:3000"],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`API http://localhost:${port}`);
}

bootstrap();
