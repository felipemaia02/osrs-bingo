import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import type { CardSummary } from '../types'

interface CardActionsProps {
  card: CardSummary
  mobile: boolean
  onEdit: (card: CardSummary) => void
  onRetire: (card: CardSummary) => void
}

/** Edit and retire for active cards; retired cards have no actions (feature 007). */
export function CardActions({ card, mobile, onEdit, onRetire }: CardActionsProps) {
  const { t } = useTranslation()
  if (card.status !== 'active') return null
  const size = mobile ? 'md' : 'sm'
  const grow = mobile ? 'flex-1' : ''
  return (
    <div className={`flex gap-2 ${mobile ? '' : 'justify-end'}`}>
      <Button
        size={size}
        className={grow}
        aria-label={t('cards.edit', { name: card.revision.name })}
        onClick={(click) => {
          click.stopPropagation()
          onEdit(card)
        }}
      >
        <EditOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        {t('common.edit')}
      </Button>
      <Button
        variant="danger"
        size={size}
        className={grow}
        aria-label={t('cards.retire', { name: card.revision.name })}
        onClick={(click) => {
          click.stopPropagation()
          onRetire(card)
        }}
      >
        <ArchiveOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        {t('cards.retireShort')}
      </Button>
    </div>
  )
}
