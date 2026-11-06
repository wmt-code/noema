import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { configureChatBodyParser } from './agent-attachments.js'
import { AppModule } from './app.module.js'

async function bootstrap(): Promise<void> {
  const rawPort = process.env.PORT ?? '3000'
  const port = Number(rawPort)
  if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  const app = await NestFactory.create(AppModule, { abortOnError: false })
  configureChatBodyParser(app)
  app.enableShutdownHooks()
  try {
    await app.listen(port, '127.0.0.1')
    console.log(`Server listening on ${await app.getUrl()}`)
  } catch (error) {
    await app.close()
    throw error
  }
}

void bootstrap().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
