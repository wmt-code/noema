import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { deploy, testDatabase } from './database.mjs'

test(
  'empty-schema migration, core relations and database constraints',
  { timeout: 60000 },
  async (t) => {
    const { prisma, schema, url } = await testDatabase(t)

    await t.test(
      'migration deploys to an empty schema and can run twice',
      async () => {
        const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = ${schema}
    `
        assert.equal(tables.length, 0)
        await deploy(url.toString())
        await deploy(url.toString())
        assert.equal(await prisma.project.count(), 0)
        const migrations = await prisma.$queryRawUnsafe(
          `SELECT migration_name FROM "${schema}"."_prisma_migrations" WHERE finished_at IS NOT NULL`
        )
        assert.deepEqual(migrations, [
          { migration_name: '20261103000000_init' },
          { migration_name: '20261103010000_auth_ownership' }
        ])
      }
    )

    const owner = await prisma.user.create({
      data: { email: 'models@example.com', passwordHash: 'test-only' }
    })
    const project = await prisma.project.create({
      data: { name: '数据库验证项目', ownerId: owner.id }
    })
    const episode = await prisma.episode.create({
      data: { projectId: project.id, title: '第一集' }
    })
    const character = await prisma.character.create({
      data: { projectId: project.id, name: '主角', description: '短剧主角' }
    })
    const revision = await prisma.scriptRevision.create({
      data: { episodeId: episode.id, version: 1, content: { text: '初稿' } }
    })
    const scene = await prisma.scene.create({
      data: { episodeId: episode.id, location: '客厅', order: 0 }
    })
    const shot = await prisma.shot.create({
      data: {
        sceneId: scene.id,
        order: 0,
        duration: '3.125',
        prompt: '主角走入客厅',
        characters: { connect: { id: character.id } }
      }
    })
    const taskData = {
      shotId: shot.id,
      type: 'VIDEO',
      provider: 'test-provider',
      model: 'test-model',
      request: { prompt: shot.prompt, duration: '3.125' },
      idempotencyKey: randomUUID()
    }
    const task = await prisma.generationTask.create({ data: taskData })
    const asset = await prisma.asset.create({
      data: {
        type: 'VIDEO',
        ownerId: owner.id,
        storageKey: 'test/shot/v1.mp4',
        generationTaskId: task.id
      }
    })
    const replacement = await prisma.asset.create({
      data: {
        type: 'VIDEO',
        ownerId: owner.id,
        storageKey: 'test/shot/v2.mp4',
        generationTaskId: task.id
      }
    })
    await prisma.shotAsset.create({
      data: { shotId: shot.id, assetId: asset.id }
    })
    await prisma.shot.update({
      where: { id: shot.id },
      data: { selectedAssetId: asset.id }
    })
    await prisma.qualityReview.create({
      data: { assetId: asset.id, result: 'PASSED' }
    })
    await prisma.exportRecord.create({
      data: { episodeId: episode.id, settings: { format: 'mp4' } }
    })

    await t.test(
      'all core entities persist and relations resolve',
      async () => {
        assert.match(project.id, /^[0-9a-f-]{36}$/)
        assert.deepEqual(project.settings, {})
        assert.equal(episode.status, 'DRAFT')
        assert.equal(shot.duration.toFixed(3), '3.125')
        assert.equal(task.status, 'QUEUED')
        assert.deepEqual(task.request, taskData.request)
        const saved = await prisma.project.findUniqueOrThrow({
          where: { id: project.id },
          include: {
            characters: true,
            episodes: {
              include: {
                scriptRevisions: true,
                exports: true,
                scenes: { include: { shots: true } }
              }
            }
          }
        })
        assert.equal(saved.characters[0].id, character.id)
        assert.equal(saved.episodes[0].scriptRevisions[0].id, revision.id)
        assert.equal(saved.episodes[0].exports[0].status, 'QUEUED')
        assert.equal(saved.episodes[0].scenes[0].shots[0].id, shot.id)
        const savedShot = await prisma.shot.findUniqueOrThrow({
          where: { id: shot.id },
          include: {
            characters: true,
            assets: true,
            selectedAsset: {
              include: { asset: { include: { reviews: true } } }
            }
          }
        })
        assert.equal(savedShot.characters[0].id, character.id)
        assert.equal(savedShot.assets.length, 1)
        assert.equal(savedShot.selectedAsset.asset.id, asset.id)
        assert.equal(savedShot.selectedAsset.asset.reviews[0].result, 'PASSED')
        assert.equal(
          await prisma.asset.count({ where: { generationTaskId: task.id } }),
          2
        )
      }
    )

    await t.test(
      'versions, sibling order, storage keys and idempotency are unique',
      async () => {
        for (const operation of [
          () =>
            prisma.scriptRevision.create({
              data: { episodeId: episode.id, version: 1, content: {} }
            }),
          () =>
            prisma.scene.create({
              data: { episodeId: episode.id, order: 0, location: '重复' }
            }),
          () =>
            prisma.shot.create({
              data: { sceneId: scene.id, order: 0, duration: 1 }
            }),
          () =>
            prisma.asset.create({
              data: {
                type: 'VIDEO',
                ownerId: owner.id,
                storageKey: asset.storageKey
              }
            }),
          () => prisma.generationTask.create({ data: taskData })
        ]) {
          await assert.rejects(operation, { code: 'P2002' })
        }
        await prisma.generationTask.update({
          where: { id: task.id },
          data: { providerTaskId: 'remote-1' }
        })
        await assert.rejects(
          () =>
            prisma.generationTask.create({
              data: {
                ...taskData,
                idempotencyKey: randomUUID(),
                providerTaskId: 'remote-1'
              }
            }),
          { code: 'P2002' }
        )
        const next = await prisma.scriptRevision.create({
          data: { episodeId: episode.id, version: 2, content: { text: '二稿' } }
        })
        assert.notEqual(next.id, revision.id)
        const nextScene = await prisma.scene.create({
          data: { episodeId: episode.id, order: 1, location: '室外' }
        })
        await prisma.shot.create({
          data: { sceneId: nextScene.id, order: 0, duration: 1 }
        })
        const scenes = await prisma.scene.findMany({
          where: { episodeId: episode.id },
          orderBy: { order: 'asc' }
        })
        assert.deepEqual(
          scenes.map((item) => item.order),
          [0, 1]
        )
      }
    )

    await t.test(
      'foreign keys and selected-asset membership are enforced',
      async () => {
        await assert.rejects(
          () =>
            prisma.episode.create({
              data: { projectId: randomUUID(), title: '孤立剧集' }
            }),
          { code: 'P2003' }
        )
        await assert.rejects(
          () =>
            prisma.shot.update({
              where: { id: shot.id },
              data: { selectedAssetId: replacement.id }
            }),
          { code: 'P2003' }
        )
        await assert.rejects(
          () => prisma.asset.delete({ where: { id: asset.id } }),
          { code: 'P2003' }
        )
        await assert.rejects(
          () =>
            prisma.shotAsset.delete({
              where: { shotId_assetId: { shotId: shot.id, assetId: asset.id } }
            }),
          { code: 'P2003' }
        )
        await prisma.shotAsset.create({
          data: { shotId: shot.id, assetId: replacement.id }
        })
        await prisma.shot.update({
          where: { id: shot.id },
          data: { selectedAssetId: replacement.id }
        })
        assert.equal(
          await prisma.asset.count({ where: { generationTaskId: task.id } }),
          2
        )
      }
    )

    await t.test(
      'invalid numeric values and edits to history are rejected by PostgreSQL',
      async () => {
        for (const [sql, constraint] of [
          [
            `UPDATE "${schema}"."ScriptRevision" SET version = 3 WHERE id = '${revision.id}'`,
            /ScriptRevision is immutable/
          ],
          [
            `UPDATE "${schema}"."Asset" SET "storageKey" = 'overwritten.mp4' WHERE id = '${asset.id}'`,
            /Asset content is immutable/
          ],
          [
            `UPDATE "${schema}"."Scene" SET "order" = -1 WHERE id = '${scene.id}'`,
            /Scene_order_nonnegative/
          ],
          [
            `UPDATE "${schema}"."Shot" SET duration = 0 WHERE id = '${shot.id}'`,
            /Shot_duration_positive/
          ],
          [
            `UPDATE "${schema}"."Shot" SET "order" = -1 WHERE id = '${shot.id}'`,
            /Shot_order_nonnegative/
          ],
          [
            `UPDATE "${schema}"."GenerationTask" SET cost = -1 WHERE id = '${task.id}'`,
            /GenerationTask_cost_nonnegative/
          ],
          [
            `INSERT INTO "${schema}"."ScriptRevision" (id, "episodeId", content, version) VALUES ('${randomUUID()}', '${episode.id}', '{}', 0)`,
            /ScriptRevision_version_positive/
          ]
        ]) {
          await assert.rejects(
            () => prisma.$executeRawUnsafe(sql),
            (error) => {
              assert.equal(error.code, 'P2010')
              assert.match(error.message, constraint)
              return true
            }
          )
        }
        const finished = await prisma.generationTask.update({
          where: { id: task.id },
          data: {
            status: 'SUCCEEDED',
            cost: '0.123456',
            finishedAt: new Date()
          }
        })
        assert.equal(finished.cost.toFixed(6), '0.123456')
        assert.equal(finished.currency, 'USD')
        assert.deepEqual(
          (
            await prisma.scriptRevision.findUniqueOrThrow({
              where: { id: revision.id }
            })
          ).content,
          { text: '初稿' }
        )
        assert.equal(
          (await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } }))
            .storageKey,
          asset.storageKey
        )
      }
    )

    await t.test(
      'project deletion cascades through business records and retains reusable media',
      async () => {
        await prisma.project.delete({ where: { id: project.id } })
        for (const model of [
          'episode',
          'scriptRevision',
          'character',
          'scene',
          'shot',
          'shotAsset',
          'generationTask',
          'exportRecord'
        ]) {
          assert.equal(await prisma[model].count(), 0, model)
        }
        assert.equal(await prisma.asset.count(), 2)
        assert.equal(
          (await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } }))
            .generationTaskId,
          null
        )
        await prisma.asset.deleteMany()
        assert.equal(await prisma.qualityReview.count(), 0)
      }
    )
  }
)
