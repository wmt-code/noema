import { Select } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'

export function FilterSelect({
  label,
  value,
  onValueChange,
  options
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className="filter-select" aria-label={label}>
        <span className="filter-select-label">
          <Select.Value />
          <Select.Icon asChild>
            <ChevronDown size={16} />
          </Select.Icon>
        </span>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="filter-options"
          position="popper"
          sideOffset={6}
          align="center"
        >
          <Select.Viewport>
            <Select.Group>
              {options.map((option) => (
                <Select.Item
                  className="filter-option"
                  key={option.value}
                  value={option.value}
                >
                  <Select.ItemIndicator className="filter-option-check">
                    <Check size={14} />
                  </Select.ItemIndicator>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
