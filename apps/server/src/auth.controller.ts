import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common'
import { CurrentUser, Public, type AuthRequest } from './auth.guard.js'
import { AuthService } from './auth.service.js'

type Response = { setHeader(name: string, value: string): unknown }

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body() body: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    response.setHeader('Cache-Control', 'no-store')
    this.auth.throttle(request.ip)
    return this.auth.register(body)
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body() body: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    response.setHeader('Cache-Control', 'no-store')
    this.auth.throttle(request.ip)
    return this.auth.login(body)
  }

  @Get('me')
  me(
    @CurrentUser() user: AuthRequest['user'],
    @Res({ passthrough: true }) response: Response
  ) {
    response.setHeader('Cache-Control', 'no-store')
    return user
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Req() request: AuthRequest): Promise<void> {
    return this.auth.logout(request.sessionId)
  }
}
