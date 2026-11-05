import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AgentService } from './agent.service.js'
import { AuthController } from './auth.controller.js'
import { AuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'
import { HealthController } from './health.controller.js'
import { OwnershipService } from './ownership.service.js'
import { PrismaService } from './prisma.service.js'
import { ProjectController } from './project.controller.js'

@Module({
  controllers: [HealthController, AuthController, ProjectController],
  providers: [
    PrismaService,
    AuthService,
    OwnershipService,
    AgentService,
    { provide: APP_GUARD, useClass: AuthGuard }
  ],
  exports: [PrismaService, OwnershipService, AgentService]
})
export class AppModule {}
