import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { FormModal } from '../../../components/ui/FormModal'
import { FIELD_CLASS } from '../../../components/ui/fieldClass'
import { profileErrorKey } from '../errors'
import { useAddAccount } from '../hooks/useProfile'

const RSN_MAX_LENGTH = 12

/** Links an RSN; the first account becomes the main (FR-003). */
export function AddAccountModal({
  first,
  onAdded,
  onClose,
}: {
  first: boolean
  onAdded: (rsn: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const add = useAddAccount()
  const [rsn, setRsn] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cleaned = rsn.trim()
    if (!cleaned) return
    add.mutate(cleaned, { onSuccess: () => onAdded(cleaned) })
  }

  return (
    <FormModal title={t('profile.add.title')} busy={add.isPending} size="sm" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="profile-add-rsn" className="font-semibold">
            {t('profile.add.rsn')}
          </label>
          <input
            id="profile-add-rsn"
            autoFocus
            value={rsn}
            maxLength={RSN_MAX_LENGTH}
            onChange={(event) => setRsn(event.target.value)}
            aria-describedby="profile-add-hint"
            className={FIELD_CLASS}
          />
          <span id="profile-add-hint" className="text-[13px] text-rs-muted">
            {t(first ? 'profile.add.firstHint' : 'profile.add.altHint')}
          </span>
        </div>
        {add.isError && (
          <p role="alert" className="m-0 text-sm text-rs-danger-text">
            {t(profileErrorKey(add.error))}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={add.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={add.isPending || !rsn.trim()}>
            {t(add.isPending ? 'profile.add.checking' : 'profile.add.submit')}
          </Button>
        </div>
      </form>
    </FormModal>
  )
}
