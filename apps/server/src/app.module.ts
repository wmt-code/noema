import { ChatController } from './chat.controller.js'
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AgentService } from './agent.service.js'
import { AgentController } from './agent.controller.js'
import { AgentConfigService } from './agent-config.service.js'
import { AgentModelService } from './agent-model.service.js'
import { ModelCredentialService } from './model-credential.service.js'
import { AuthController } from './auth.controller.js'
import { AuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'
import { HealthController } from './health.controller.js'
import { OwnershipService } from './ownership.service.js'
import { PrismaService } from './prisma.service.js'
import { ProjectController } from './project.controller.js'

@Module({
  controllers: [
    ChatController,
    HealthController,
    AuthController,
    ProjectController,
    AgentController
  ],
  providers: [
    PrismaService,
    AuthService,
    OwnershipService,
    AgentService,
    AgentConfigService,
    AgentModelService,
    ModelCredentialService,
    { provide: APP_GUARD, useClass: AuthGuard }
  ],
  exports: [PrismaService, OwnershipService, AgentService]
})
export class AppModule {}
