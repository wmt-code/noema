import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req
} from '@nestjs/common'
import {
  parseEpisodeCreate,
  parseEpisodePatch,
  parseProjectCreate,
  parseProjectPatch
} from '@noema/shared'
import { Prisma } from './generated/prisma/client.js'
import { type AuthRequest } from './auth.guard.js'
import { OwnershipService } from './ownership.service.js'
import { PrismaService } from './prisma.service.js'

function parse<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    throw new BadRequestException((error as Error).message)
  }
}

@Controller()
export class ProjectController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService
  ) {}

  @Post('projects')
  createProject(@Req() request: AuthRequest, @Body() body: unknown) {
    const input = parse(() => parseProjectCreate(body))
    return this.prisma.project.create({
      data: {
        name: input.name,
        ownerId: request.user.id,
        ...(input.settings
          ? { settings: input.settings as Prisma.InputJsonObject }
          : {})
      }
    })
  }

  @Get('projects')
  listProjects(@Req() request: AuthRequest) {
    return this.prisma.project.findMany({
      where: { ownerId: request.user.id },
      orderBy: { createdAt: 'desc' }
    })
  }

  @Get('projects/:id')
  async getProject(@Req() request: AuthRequest, @Param('id') id: string) {
    await this.ownership.assertOwned(request.user.id, 'project', id)
    return this.prisma.project.findUniqueOrThrow({ where: { id } })
  }

  @Patch('projects/:id')
  async patchProject(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    await this.ownership.assertOwned(request.user.id, 'project', id)
    const input = parse(() => parseProjectPatch(body))
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.settings !== undefined
          ? { settings: input.settings as Prisma.InputJsonObject }
          : {})
      }
    })
  }

  @Delete('projects/:id')
  @HttpCode(204)
  async deleteProject(
    @Req() request: AuthRequest,
    @Param('id') id: string
  ): Promise<void> {
    await this.ownership.assertOwned(request.user.id, 'project', id)
    await this.prisma.project.delete({ where: { id } })
  }

  @Post('projects/:projectId/episodes')
  async createEpisode(
    @Req() request: AuthRequest,
    @Param('projectId') projectId: string,
    @Body() body: unknown
  ) {
    await this.ownership.assertOwned(request.user.id, 'project', projectId)
    const input = parse(() => parseEpisodeCreate(body))
    return this.prisma.episode.create({
      data: {
        projectId,
        title: input.title,
        ...(input.status ? { status: input.status } : {})
      }
    })
  }

  @Get('projects/:projectId/episodes')
  async listEpisodes(
    @Req() request: AuthRequest,
    @Param('projectId') projectId: string
  ) {
    await this.ownership.assertOwned(request.user.id, 'project', projectId)
    return this.prisma.episode.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    })
  }

  @Get('episodes/:id')
  async getEpisode(@Req() request: AuthRequest, @Param('id') id: string) {
    await this.ownership.assertOwned(request.user.id, 'episode', id)
    return this.prisma.episode.findUniqueOrThrow({ where: { id } })
  }

  @Patch('episodes/:id')
  async patchEpisode(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    await this.ownership.assertOwned(request.user.id, 'episode', id)
    const input = parse(() => parseEpisodePatch(body))
    return this.prisma.episode.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      }
    })
  }

  @Delete('episodes/:id')
  @HttpCode(204)
  async deleteEpisode(
    @Req() request: AuthRequest,
    @Param('id') id: string
  ): Promise<void> {
    await this.ownership.assertOwned(request.user.id, 'episode', id)
    await this.prisma.episode.delete({ where: { id } })
  }
}
