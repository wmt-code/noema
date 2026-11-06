import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { PrismaService } from './prisma.service.js'

export type Resource =
  | 'chatThread'
  | 'project'
  | 'episode'
  | 'scriptRevision'
  | 'character'
  | 'scene'
  | 'shot'
  | 'generationTask'
  | 'asset'
  | 'qualityReview'
  | 'exportRecord'

@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async assertOwned(
    ownerId: string,
    resource: Resource,
    id: string
  ): Promise<void> {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Resource id must be a UUID')
    }
    const project = { ownerId }
    const episode = { project }
    const scene = { episode }
    const shot = { scene }
    const select = { id: true } as const
    // Filter ownership in SQL; never trust ownerId supplied in an HTTP body.
    const queries = {
      chatThread: () =>
        this.prisma.chatThread.findFirst({
          where: { id, userId: ownerId },
          select
        }),
      project: () =>
        this.prisma.project.findFirst({ where: { id, ...project }, select }),
      episode: () =>
        this.prisma.episode.findFirst({ where: { id, ...episode }, select }),
      scriptRevision: () =>
        this.prisma.scriptRevision.findFirst({
          where: { id, episode },
          select
        }),
      character: () =>
        this.prisma.character.findFirst({ where: { id, project }, select }),
      scene: () =>
        this.prisma.scene.findFirst({ where: { id, ...scene }, select }),
      shot: () =>
        this.prisma.shot.findFirst({ where: { id, ...shot }, select }),
      generationTask: () =>
        this.prisma.generationTask.findFirst({ where: { id, shot }, select }),
      asset: () =>
        this.prisma.asset.findFirst({ where: { id, ownerId }, select }),
      qualityReview: () =>
        this.prisma.qualityReview.findFirst({
          where: { id, asset: { ownerId } },
          select
        }),
      exportRecord: () =>
        this.prisma.exportRecord.findFirst({ where: { id, episode }, select })
    }
    if (!(await queries[resource]()))
      throw new NotFoundException('Resource not found')
  }
}
