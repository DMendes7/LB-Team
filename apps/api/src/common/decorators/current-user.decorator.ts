import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type JwtUser = { sub: string; email: string; role: string };

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): JwtUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});
