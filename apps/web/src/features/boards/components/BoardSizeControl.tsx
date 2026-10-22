import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { BOARD_SIZES } from '../draft'

type SizeValue = `${(typeof BOARD_SIZES)[number]}`

interface BoardSizeControlProps {
  size: number
  editable: boolean
  onChange: (size: number) => void
  variant?: 'segment' | 'chip'
}

/** Board size picker (3×3–6×6) while the event is a draft; read-only text otherwise. */
export function BoardSizeControl({
  size,
  editable,
  onChange,
  variant = 'segment',
}: BoardSizeControlProps) {
  const { t } = useTranslation()
  const dimensions = (value: number) => t('boards.size.dimensions', { size: value })
  if (!editable) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-rs-muted">
        <GridViewOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
        {t('boards.size.label')} <strong className="text-rs-text">{dimensions(size)}</strong>
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-rs-muted">{t('boards.size.label')}</span>
      <SegmentedControl<SizeValue>
        label={t('boards.size.label')}
        variant={variant}
        value={String(size) as SizeValue}
        onChange={(value) => onChange(Number(value))}
        options={BOARD_SIZES.map((value) => ({
          value: String(value) as SizeValue,
          label: dimensions(value),
        }))}
      />
    </div>
  )
}
