import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, JwtUser } from "../common/decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() u: JwtUser) {
    return this.auth.me(u.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me")
  patchMe(@CurrentUser() u: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(u.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  @HttpCode(204)
  changePassword(@CurrentUser() u: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(u.sub, dto);
  }
}
