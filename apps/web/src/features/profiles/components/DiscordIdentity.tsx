import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useTranslation } from 'react-i18next'
import { Panel } from '../../../components/ui/Panel'

/** Discord username and ID, read-only (FR-002). */
export function DiscordIdentity({ username, discordId }: { username: string; discordId: string }) {
  const { t } = useTranslation()
  return (
    <Panel
      as="section"
      aria-labelledby="profile-discord-title"
      className="flex flex-wrap items-center gap-3 px-4 py-3.5 md:gap-4"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-rs-border-strong bg-rs-raised text-lg font-bold text-rs-gold-bright"
      >
        {username.charAt(0).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-col">
        <h2
          id="profile-discord-title"
          className="m-0 truncate font-display text-lg font-bold text-rs-gold-bright"
        >
          {username}
        </h2>
        <span className="text-[13px] text-rs-muted">
          {t('profile.discord.id', { id: discordId })}
        </span>
      </div>
      <span className="inline-flex items-center gap-1 text-[11px] text-rs-muted md:ml-auto">
        <LockOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
        {t('profile.discord.automatic')}
      </span>
    </Panel>
  )
}
