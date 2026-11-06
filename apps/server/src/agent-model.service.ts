import { envApiKeyAuth, type Model } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { compatibleBaseUrl, gatewayFetch } from './compatible-gateway.js'
import {
  createModels,
  createProvider,
  getSupportedThinkingLevels
} from '@earendil-works/pi-ai/models'
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai'
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic'
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException
} from '@nestjs/common'
import type { StreamFn } from '@earendil-works/pi-agent-core'
import { ModelCredentialService } from './model-credential.service.js'

@Injectable()
export class AgentModelService {
  private readonly models = createModels()
  constructor(private readonly credentials: ModelCredentialService) {
    this.models.setProvider(openaiProvider())
    this.models.setProvider(anthropicProvider())
    this.models.setProvider(
      createProvider({
        id: 'openai-compatible',
        auth: { apiKey: envApiKeyAuth('OpenAI compatible', []) },
        models: [],
        api: openAICompletionsApi()
      })
    )
  }

  list() {
    return this.models
      .getModels()
      .filter((model) => model.input.includes('text'))
      .map((model) => ({
        provider: model.provider,
        id: model.id,
        name: model.name,
        thinkingLevels: getSupportedThinkingLevels(model)
      }))
  }

  model(provider: string, id: string) {
    const model = this.models.getModel(provider, id)
    if (!model || !model.input.includes('text'))
      throw new BadRequestException('Unsupported model')
    return model
  }

  async resolve(
    userId: string,
    provider: string,
    id: string,
    reasoning = false
  ) {
    const { apiKey, baseUrl } = await this.credentials.get(userId, provider)
    let model: Model<'openai-completions'> | ReturnType<typeof this.model>
    if (provider === 'openai-compatible') {
      if (!baseUrl)
        throw new ServiceUnavailableException('Configure the gateway Base URL')
      model = {
        provider,
        id,
        name: id,
        api: 'openai-completions',
        baseUrl: compatibleBaseUrl(baseUrl),
        reasoning,
        input: ['text', 'image'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 32768,
        maxTokens: 32768,
        compat: {
          supportsStore: false,
          supportsDeveloperRole: false,
          supportsUsageInStreaming: false,
          maxTokensField: 'max_tokens'
        }
      }
    } else model = this.model(provider, id)
    const streamFn: StreamFn = (model, context, options) =>
      this.models.streamSimple(model, context, {
        ...options,
        apiKey,
        ...(provider === 'openai-compatible' ? { fetch: gatewayFetch } : {}),
        maxRetries: 0
      })
    return { model, streamFn }
  }
}
