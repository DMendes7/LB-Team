import { Controller, Get, Head, NotFoundException, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { existsSync, statSync, createReadStream } from "fs";
import { extname, join } from "path";
import { PrismaService } from "../prisma/prisma.service";

const MIME_BY_EXT: Record<string, string> = {
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

@Controller("files")
export class ExerciseFilesController {
  constructor(private prisma: PrismaService) {}

  @Get("exercises/:filename")
  async getExerciseVideo(@Param("filename") filename: string, @Req() req: Request, @Res() res: Response) {
    return this.sendExerciseVideo(filename, req, res, false);
  }

  @Head("exercises/:filename")
  async headExerciseVideo(@Param("filename") filename: string, @Req() req: Request, @Res() res: Response) {
    return this.sendExerciseVideo(filename, req, res, true);
  }

  private async sendExerciseVideo(filename: string, req: Request, res: Response, headOnly: boolean) {
    const localPath = join(process.cwd(), "uploads", "exercises", filename);
    if (existsSync(localPath)) {
      const stats = statSync(localPath);
      return this.sendLocalFile(localPath, stats.size, req, res, headOnly);
    }

    const key = `exercises/${filename}`;
    const asset = await this.prisma.exerciseVideoAsset.findUnique({
      where: { key },
      select: { data: true, mimeType: true, sizeBytes: true, updatedAt: true },
    });
    if (!asset) throw new NotFoundException();

    return this.sendBuffer(asset.data, asset.mimeType, asset.sizeBytes, asset.updatedAt, req, res, headOnly);
  }

  private sendLocalFile(path: string, size: number, req: Request, res: Response, headOnly: boolean) {
    const range = req.headers.range;
    const mimeType = MIME_BY_EXT[extname(path).toLowerCase()] ?? "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (!range) {
      res.setHeader("Content-Length", String(size));
      if (headOnly) {
        res.status(200).end();
        return;
      }
      res.sendFile(path);
      return;
    }

    const parsed = this.parseRange(range, size);
    if (!parsed) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
      return;
    }

    const { start, end } = parsed;
    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", String(chunkSize));
    if (headOnly) {
      res.end();
      return;
    }
    createReadStream(path, { start, end }).pipe(res);
  }

  private sendBuffer(
    data: Buffer,
    mimeType: string,
    size: number,
    updatedAt: Date,
    req: Request,
    res: Response,
    headOnly: boolean,
  ) {
    const range = req.headers.range;
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Last-Modified", updatedAt.toUTCString());

    if (!range) {
      res.setHeader("Content-Length", String(size));
      if (headOnly) {
        res.status(200).end();
        return;
      }
      res.status(200).end(data);
      return;
    }

    const parsed = this.parseRange(range, size);
    if (!parsed) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
      return;
    }

    const { start, end } = parsed;
    const chunk = data.subarray(start, end + 1);
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", String(chunk.length));
    if (headOnly) {
      res.end();
      return;
    }
    res.end(chunk);
  }

  private parseRange(rangeHeader: string, size: number) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) return null;

    const startRaw = match[1];
    const endRaw = match[2];

    let start = startRaw ? Number.parseInt(startRaw, 10) : NaN;
    let end = endRaw ? Number.parseInt(endRaw, 10) : NaN;

    if (Number.isNaN(start)) {
      const suffixLength = Number.isNaN(end) ? 0 : end;
      if (suffixLength <= 0) return null;
      start = Math.max(size - suffixLength, 0);
      end = size - 1;
    } else if (Number.isNaN(end) || end >= size) {
      end = size - 1;
    }

    if (start < 0 || start >= size || end < start) return null;
    return { start, end };
  }
}
