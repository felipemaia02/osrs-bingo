import type { Activity, Member } from '../profiles/types'

/** Navigation state key: the event just joined, for the Events page confirmation. */
export const JOINED_STATE = 'joinedEvent'
export const STEP_COUNT = 4
export const AGREEMENTS = ['rules', 'dropAccount', 'team'] as const
export type Agreement = (typeof AGREEMENTS)[number]

export interface JoinForm {
  accountId: string | null
  activity: Activity | null
  teammates: Member[]
  agreed: Record<Agreement, boolean>
}

export function allAgreed(form: JoinForm): boolean {
  return AGREEMENTS.every((agreement) => form.agreed[agreement])
}

/** Whether a step's required input is complete (step 2 and 4 have none). */
export function stepDone(step: number, form: JoinForm): boolean {
  if (step === 0) return form.accountId !== null
  if (step === 2) return allAgreed(form)
  return true
}

export function canSend(form: JoinForm): boolean {
  return form.accountId !== null && allAgreed(form)
}
