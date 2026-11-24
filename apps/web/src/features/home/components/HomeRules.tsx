import { useState } from 'react'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { BingoRulesModal } from '../../events/components/BingoRulesModal'
import { RulesSummaryCards } from '../../events/components/RulesSummary'
import type { BingoEvent } from '../../events/types'
import { HomeSection } from './HomeSection'

/** The fixed rules at a glance; "Read all rules" opens them in a modal (068). */
export function HomeRules({ event }: { event: BingoEvent | null }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <HomeSection id="home-rules" title={t('rulesPage.title')}>
      <RulesSummaryCards hasBuyIn={Boolean(event?.buy_in)} />
      <div>
        <Button onClick={() => setOpen(true)}>
          <MenuBookOutlinedIcon fontSize="small" aria-hidden="true" />
          {t('homePage.rules.readAll')}
        </Button>
      </div>
      {open && <BingoRulesModal event={event} onClose={() => setOpen(false)} />}
    </HomeSection>
  )
}
