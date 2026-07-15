import SearchInput from '../ui/SearchInput'

interface DiscoverSearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
}

export default function DiscoverSearchBar({ value, onChange, onClear }: DiscoverSearchBarProps) {
  return (
    <SearchInput
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder="Search venues or cuisines"
    />
  )
}
