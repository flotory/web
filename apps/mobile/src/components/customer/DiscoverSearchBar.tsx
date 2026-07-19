import { useTranslation } from 'react-i18next'

import SearchInput from '../ui/SearchInput'

interface DiscoverSearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
}

export default function DiscoverSearchBar({ value, onChange, onClear }: DiscoverSearchBarProps) {
  const { t } = useTranslation()

  return (
    <SearchInput
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder={t('venues.searchPlaceholder')}
    />
  )
}
