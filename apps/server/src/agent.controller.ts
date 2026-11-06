import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  Res
} from '@nestjs/common'
import type { ServerResponse } from 'node:http'
import { z } from 'zod'
import type { AuthRequest } from './auth.guard.js'
import {
  AgentConfigService,
  parseAgentInput,
  providerSchema
} from './agent-config.service.js'
import { compatibleBaseUrl } from './compatible-gateway.js'
import { AgentModelService } from './agent-model.service.js'
import { ModelCredentialService } from './model-credential.service.js'

@Controller()
export class AgentController {
  constructor(
    private readonly config: AgentConfigService,
    private readonly models: AgentModelService,
    private readonly credentials: ModelCredentialService
  ) {}

  @Get('agent-models')
  modelsList() {
    return this.models.list()
  }

  @Get('model-credentials')
  credentialsList(@Req() request: AuthRequest) {
    return this.credentials.list(request.user.id)
  }

  @Put('model-credentials/:provider')
  @HttpCode(204)
  saveCredential(
    @Req() request: AuthRequest,
    @Param('provider') provider: string,
    @Body() body: unknown
  ) {
    const id = parseAgentInput(providerSchema, provider)
    const key = z
      .string()
      .trim()
      .min(1)
      .max(4096)
      .regex(/^[\x21-\x7e]+$/)
    if (id === 'openai-compatible') {
      const input = parseAgentInput(
        z.strictObject({
          apiKey: key,
          baseUrl: z.string().trim().min(1).max(2048)
        }),
        body
      )
      return this.credentials.save(
        request.user.id,
        id,
        input.apiKey,
        compatibleBaseUrl(input.baseUrl)
      )
    }
    const input = parseAgentInput(z.strictObject({ apiKey: key }), body)
    return this.credentials.save(request.user.id, id, input.apiKey)
  }

  @Delete('model-credentials/:provider')
  @HttpCode(204)
  removeCredential(
    @Req() request: AuthRequest,
    @Param('provider') provider: string
  ) {
    return this.credentials.remove(
      request.user.id,
      parseAgentInput(providerSchema, provider)
    )
  }

  @Get('chat-config')
  async defaultConfig(@Req() request: AuthRequest) {
    return { config: await this.config.get(request.user.id, null) }
  }

  @Put('chat-config')
  saveDefault(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.config.save(request.user.id, null, body)
  }

  @Get('projects/:id/agent-config')
  async getConfig(@Req() request: AuthRequest, @Param('id') id: string) {
    return { config: await this.config.get(request.user.id, id) }
  }

  @Put('projects/:id/agent-config')
  putConfig(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.config.save(request.user.id, id, body)
  }

  @Post('projects/:id/agent-runs')
  @HttpCode(200)
  runProject(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: ServerResponse
  ) {
    return this.run(request, 'project', id, body, response)
  }

  @Post('episodes/:id/agent-runs')
  @HttpCode(200)
  runEpisode(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: ServerResponse
  ) {
    return this.run(request, 'episode', id, body, response)
  }

  private async run(
    request: AuthRequest,
    resource: 'project' | 'episode',
    id: string,
    body: unknown,
    response: ServerResponse
  ) {
    const controller = new AbortController()
    const cancel = () => controller.abort()
    response.once('close', cancel)
    try {
      return await this.config.run(
        { user: request.user, resource, resourceId: id },
        body,
        controller.signal
      )
    } finally {
      response.removeListener('close', cancel)
    }
  }
}
