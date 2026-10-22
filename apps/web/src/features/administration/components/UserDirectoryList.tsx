import { useTranslation } from 'react-i18next'
import { Avatar } from '../../../components/ui/Avatar'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { CurrentUser } from '../../auth/api/authApi'

interface UserListProps {
  users: CurrentUser[]
  currentUserId: string | undefined
  busy: boolean
  onChangeRole: (user: CurrentUser) => void
}

const CELL = 'border-b border-rs-border/45 px-3 py-2.5 align-middle'
const HEAD =
  'whitespace-nowrap border-b border-rs-border bg-rs-inset px-3 py-2.5 text-left text-xs font-semibold text-rs-muted'

function UserName({ user, isYou }: { user: CurrentUser; isYou: boolean }) {
  const { t } = useTranslation()
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={user.username} size="lg" />
      <span className="min-w-0 break-words font-semibold">{user.username}</span>
      {isYou && <Badge tone="info">{t('admin.you')}</Badge>}
    </span>
  )
}

function RoleBadge({ user }: { user: CurrentUser }) {
  const { t } = useTranslation()
  return (
    <Badge tone={user.is_admin ? 'gold' : 'neutral'}>
      {t(user.is_admin ? 'admin.adminRole' : 'admin.playerRole')}
    </Badge>
  )
}

function RoleAction({
  user,
  busy,
  mobile,
  onChangeRole,
}: {
  user: CurrentUser
  busy: boolean
  mobile: boolean
  onChangeRole: (user: CurrentUser) => void
}) {
  const { t } = useTranslation()
  return (
    <Button
      variant={user.is_admin ? 'danger' : 'default'}
      size={mobile ? 'md' : 'sm'}
      className={mobile ? 'w-full' : ''}
      disabled={busy}
      onClick={() => onChangeRole(user)}
      aria-label={t(user.is_admin ? 'admin.revokeFrom' : 'admin.grantTo', {
        name: user.username,
      })}
    >
      {t(user.is_admin ? 'admin.revokeShort' : 'admin.grantShort')}
    </Button>
  )
}

/** Desktop directory table (teams v2 table pattern). */
export function UserDirectoryTable({ users, currentUserId, busy, onChangeRole }: UserListProps) {
  const { t } = useTranslation()
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={HEAD}>{t('admin.table.user')}</th>
          <th className={HEAD}>{t('admin.table.discord')}</th>
          <th className={HEAD}>{t('admin.role')}</th>
          <th className={`${HEAD} text-right`}>{t('admin.table.action')}</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td className={CELL}>
              <UserName user={user} isYou={user.id === currentUserId} />
            </td>
            <td className={`${CELL} break-all text-[13px] text-rs-muted`}>{user.discord_id}</td>
            <td className={CELL}>
              <RoleBadge user={user} />
            </td>
            <td className={`${CELL} text-right`}>
              <RoleAction user={user} busy={busy} mobile={false} onChangeRole={onChangeRole} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Mobile directory cards with a full-width 44 px action. */
export function UserDirectoryCards({ users, currentUserId, busy, onChangeRole }: UserListProps) {
  const { t } = useTranslation()
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex flex-col gap-2.5 rounded border border-rs-border bg-rs-surface p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <UserName user={user} isYou={user.id === currentUserId} />
            <RoleBadge user={user} />
          </div>
          <span className="break-all text-xs text-rs-muted">
            {t('admin.discordIdentity', { id: user.discord_id })}
          </span>
          <RoleAction user={user} busy={busy} mobile onChangeRole={onChangeRole} />
        </li>
      ))}
    </ul>
  )
}
