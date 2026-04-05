import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, unlinkSync } from "fs";
import { Role, FitnessLevel } from "@prisma/client";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]);

const exerciseUpdateKeys = new Set([
  "name",
  "category",
  "muscleGroup",
  "level",
  "type",
  "description",
  "instructions",
  "videoUrl",
  "imageUrl",
  "equipment",
  "contraindications",
  "tags",
  "technicalNotes",
  "videoFileKey",
]);

@Controller("trainer/exercises")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER, Role.ADMIN)
export class ExercisesTrainerController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() u: JwtUser) {
    return this.prisma.exercise.findMany({
      where: { trainerId: u.sub },
      include: { substitutionsFrom: { include: { substitute: true } } },
      orderBy: { name: "asc" },
    });
  }

  @Get(":id")
  async one(@Param("id") id: string, @CurrentUser() u: JwtUser) {
    const ex = await this.prisma.exercise.findFirst({
      where: { id, trainerId: u.sub },
      include: { substitutionsFrom: { include: { substitute: true } } },
    });
    if (!ex) throw new NotFoundException();
    return ex;
  }

  @Post()
  create(
    @CurrentUser() u: JwtUser,
    @Body()
    body: {
      name: string;
      category: string;
      muscleGroup: string;
      level: FitnessLevel;
      type: string;
      description?: string;
      instructions?: string;
      videoUrl?: string;
      imageUrl?: string;
      equipment?: string;
      contraindications?: string;
      tags?: string;
      technicalNotes?: string;
      substituteExerciseIds?: string[];
    },
  ) {
    return this.prisma.exercise.create({
      data: {
        trainerId: u.sub,
        name: body.name,
        category: body.category,
        muscleGroup: body.muscleGroup,
        level: body.level,
        type: body.type,
        description: body.description,
        instructions: body.instructions,
        videoUrl: body.videoUrl,
        imageUrl: body.imageUrl,
        equipment: body.equipment,
        contraindications: body.contraindications,
        tags: body.tags,
        technicalNotes: body.technicalNotes,
        substitutionsFrom: body.substituteExerciseIds?.length
          ? {
              create: body.substituteExerciseIds.map((id) => ({
                substituteExerciseId: id,
              })),
            }
          : undefined,
      },
      include: { substitutionsFrom: { include: { substitute: true } } },
    });
  }

  @Post(":id/video")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: join(process.cwd(), "uploads", "exercises"),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || "") || ".mp4";
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
        },
      }),
      limits: { fileSize: 120 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!VIDEO_MIMES.has(file.mimetype)) {
          cb(new BadRequestException("Use MP4, MOV ou WebM."), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadVideo(
    @Param("id") id: string,
    @CurrentUser() u: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Arquivo obrigatório.");
    const ex = await this.prisma.exercise.findFirst({ where: { id, trainerId: u.sub } });
    if (!ex) throw new NotFoundException();
    if (ex.videoFileKey) {
      const oldPath = join(process.cwd(), "uploads", ex.videoFileKey);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }
    const key = `exercises/${file.filename}`;
    return this.prisma.exercise.update({
      where: { id },
      data: { videoFileKey: key, videoUrl: null },
      include: { substitutionsFrom: { include: { substitute: true } } },
    });
  }

  @Delete(":id/video")
  async removeVideo(@Param("id") id: string, @CurrentUser() u: JwtUser) {
    const ex = await this.prisma.exercise.findFirst({ where: { id, trainerId: u.sub } });
    if (!ex) throw new NotFoundException();
    if (ex.videoFileKey) {
      const p = join(process.cwd(), "uploads", ex.videoFileKey);
      if (existsSync(p)) unlinkSync(p);
    }
    return this.prisma.exercise.update({
      where: { id },
      data: { videoFileKey: null },
      include: { substitutionsFrom: { include: { substitute: true } } },
    });
  }

  @Patch(":id")
  async update(@Param("id") id: string, @CurrentUser() u: JwtUser, @Body() body: Record<string, unknown>) {
    const { substituteExerciseIds, ...rest } = body;
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (exerciseUpdateKeys.has(k)) data[k] = v;
    }
    if (Object.keys(data).length) {
      await this.prisma.exercise.updateMany({ where: { id, trainerId: u.sub }, data: data as object });
    }
    if (Array.isArray(substituteExerciseIds)) {
      await this.prisma.exerciseSubstitution.deleteMany({ where: { primaryExerciseId: id } });
      if (substituteExerciseIds.length) {
        await this.prisma.exerciseSubstitution.createMany({
          data: substituteExerciseIds.map((sid: string) => ({
            primaryExerciseId: id,
            substituteExerciseId: sid,
          })),
        });
      }
    }
    return this.prisma.exercise.findFirst({
      where: { id, trainerId: u.sub },
      include: { substitutionsFrom: { include: { substitute: true } } },
    });
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() u: JwtUser) {
    const ex = await this.prisma.exercise.findFirst({ where: { id, trainerId: u.sub } });
    if (ex?.videoFileKey) {
      const p = join(process.cwd(), "uploads", ex.videoFileKey);
      if (existsSync(p)) unlinkSync(p);
    }
    await this.prisma.exercise.deleteMany({ where: { id, trainerId: u.sub } });
    return { ok: true };
  }
}
