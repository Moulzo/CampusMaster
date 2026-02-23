import { UnauthorizedException } from "@nestjs/common";

export function getUserId(req: any): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedException("Missing user id");
  return id;
}
