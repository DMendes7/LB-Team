import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StudentLinksService } from "../student-links/student-links.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private studentLinks: StudentLinksService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) throw new ConflictException("É necessário aceitar os termos.");
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException("E-mail já cadastrado.");

    const hash = await bcrypt.hash(dto.password, 10);
    const role = Role.STUDENT;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        name: dto.name,
        phone: dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        role,
        profile: { create: { termsAcceptedAt: new Date() } },
        ...(role === Role.STUDENT
          ? {
              studentProfile: { create: {} },
              userLevel: { create: {} },
              streakState: { create: {} },
            }
          : {}),
      },
    });

    if (role === Role.STUDENT) {
      await this.studentLinks.ensureDefaultProfessionalLinks(user.id);
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Credenciais inválidas.");
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Credenciais inválidas.");
    if (user.role === Role.STUDENT) {
      await this.studentLinks.ensureDefaultProfessionalLinks(user.id);
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        birthDate: true,
        role: true,
        createdAt: true,
        profile: true,
        studentProfile: {
          include: { physicalLimitations: true, onboardingAnswers: true },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const touched =
      dto.name !== undefined ||
      dto.phone !== undefined ||
      dto.birthDate !== undefined ||
      dto.weightKg !== undefined ||
      dto.heightCm !== undefined;
    if (!touched) {
      throw new BadRequestException("Nenhum campo para atualizar.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
          ...(dto.birthDate !== undefined ? { birthDate: new Date(dto.birthDate) } : {}),
        },
      });

      if (dto.weightKg !== undefined || dto.heightCm !== undefined) {
        await tx.userProfile.upsert({
          where: { userId },
          create: {
            userId,
            weightKg: dto.weightKg ?? null,
            heightCm: dto.heightCm ?? null,
          },
          update: {
            ...(dto.weightKg !== undefined ? { weightKg: dto.weightKg } : {}),
            ...(dto.heightCm !== undefined ? { heightCm: dto.heightCm } : {}),
          },
        });
      }
    });

    return this.me(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Senha atual incorreta.");
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });
  }

  private issueTokens(sub: string, email: string, role: Role) {
    const payload = { sub, email, role };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: sub, email, role },
    };
  }
}
