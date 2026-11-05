import {
  createParamDecorator,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthService } from './auth.service.js'

export type AuthRequest = {
  headers: { authorization?: string }
  ip: string
  user: { id: string; email: string }
  sessionId: string
}

export const Public = () => SetMetadata('public', true)
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthRequest>().user
)

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass()
      ])
    ) {
      return true
    }
    const request = context.switchToHttp().getRequest<AuthRequest>()
    Object.assign(
      request,
      await this.auth.authenticate(request.headers.authorization)
    )
    return true
  }
}
