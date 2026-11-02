import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { FormModal } from '../../../components/ui/FormModal'
import type { DirectoryUser } from '../api/administrationApi'

/** What an administrator can do, listed before granting access (feature 055). */
const POWERS = ['players', 'review', 'content', 'admins'] as const

/** Typed name matches the Discord name, ignoring case and outer spaces. */
const confirmsName = (typed: string, name: string) =>
  typed.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase()

/** Granting admin needs the user's Discord name typed in (FR-004). */
export function GrantAdminDialog({
  user,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  user: DirectoryUser
  busy: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState('')
  const matches = confirmsName(typed, user.username)
  return (
    <FormModal
      title={t('admin.grant.title', { name: user.username })}
      busy={busy}
      size="sm"
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(submit) => {
          submit.preventDefault()
          if (matches && !busy) onConfirm()
        }}
      >
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
          <dt className="text-rs-muted">{t('admin.grant.discord')}</dt>
          <dd className="m-0 font-semibold">{user.username}</dd>
          <dt className="text-rs-muted">{t('admin.table.rsn')}</dt>
          <dd className="m-0 font-semibold">{user.rsn ?? '—'}</dd>
        </dl>
        <div className="text-[13px]">
          <p className="m-0 mb-1">{t('admin.grant.powers')}</p>
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 text-rs-muted">
            {POWERS.map((power) => (
              <li key={power}>{t(`admin.grant.power.${power}`)}</li>
            ))}
          </ul>
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          {t('admin.grant.typeName', { name: user.username })}
          <input
            value={typed}
            onChange={(change) => setTyped(change.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={FIELD_CLASS}
          />
        </label>
        {error && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-rs-danger/60 bg-rs-inset p-3 text-sm"
          >
            {error}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" disabled={!matches || busy}>
            {busy ? t('common.saving') : t('admin.grant.confirm')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
