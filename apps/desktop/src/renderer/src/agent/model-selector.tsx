'use client'

import * as React from 'react'
import { ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'

import type { AgentModel } from '../../../shared/api'
const types = ['openai', 'anthropic'] as const
export function ModelSelector({
  models,
  value,
  onSelect,
  disabled
}: {
  models: AgentModel[]
  value: Pick<AgentModel, 'provider' | 'id'>
  onSelect: (model: AgentModel) => void
  disabled: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const compatible = value.provider === 'openai-compatible'
  const selectedModel = models.find(
    (m) => m.provider === value.provider && m.id === value.id
  )
  return (
    <div className="grid gap-3">
      <Label htmlFor="agent-model">模型</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            id="agent-model"
            disabled={disabled}
            aria-label="模型"
            className="w-full justify-between"
          >
            <span className="truncate">
              {compatible
                ? 'OpenAI 兼容服务'
                : (selectedModel?.name ?? '选择模型…')}
            </span>
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command loop label="搜索模型">
            <CommandInput placeholder="搜索模型名称或编号…" />
            <CommandList className="max-h-[min(320px,45dvh)]">
              <CommandEmpty>没有找到模型。</CommandEmpty>

              <CommandGroup heading="自定义">
                <CommandItem
                  value="OpenAI 兼容服务 自定义模型 ID"
                  data-checked={compatible}
                  onSelect={() => {
                    onSelect({
                      provider: 'openai-compatible',
                      id: compatible ? value.id : '',
                      name: 'OpenAI 兼容服务',
                      thinkingLevels: ['off', 'low', 'medium', 'high']
                    })
                    setOpen(false)
                  }}
                >
                  OpenAI 兼容服务
                </CommandItem>
              </CommandGroup>
              {types.map((type) => (
                <CommandGroup
                  key={type}
                  heading={type === 'openai' ? 'OpenAI' : 'Anthropic'}
                >
                  {models
                    .filter((model) => model.provider === type)
                    .map((model) => (
                      <CommandItem
                        key={model.id}
                        data-checked={
                          selectedModel?.provider === type &&
                          selectedModel.id === model.id
                        }
                        value={model.provider + '/' + model.id}
                        keywords={[model.name]}
                        onSelect={() => {
                          onSelect(model)
                          setOpen(false)
                        }}
                      >
                        {model.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
