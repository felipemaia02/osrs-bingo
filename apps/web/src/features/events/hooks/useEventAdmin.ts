import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventTransition } from '../components/EventActions'
import { eventErrorKey } from '../errors'
import type { BingoEvent, EventPayload, EventRules } from '../types'
import { useEventMutations } from './useEvents'

type FormTarget = { event: BingoEvent | null } | null
type PendingTransition = { event: BingoEvent; action: EventTransition } | null

/** Form, transition and feedback state for the admin events page. */
export function useEventAdmin() {
  const { t } = useTranslation()
  const mutations = useEventMutations()
  const [form, setForm] = useState<FormTarget>(null)
  const [transition, setTransition] = useState<PendingTransition>(null)
  const [transitionError, setTransitionError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [rulesEvent, setRulesEvent] = useState<BingoEvent | null>(null)

  async function save(payload: EventPayload) {
    const editing = form?.event ?? null
    if (editing) await mutations.updateEvent.mutateAsync({ eventId: editing.id, payload })
    else await mutations.createEvent.mutateAsync(payload)
    setFeedback(t(editing ? 'events.feedback.updated' : 'events.feedback.created'))
    setForm(null)
  }

  async function saveRules(rules: EventRules) {
    if (!rulesEvent) return
    await mutations.updateRules.mutateAsync({ eventId: rulesEvent.id, rules })
    setFeedback(t('events.feedback.rulesSaved'))
    setRulesEvent(null)
  }

  async function addAddendum(text: string) {
    if (!rulesEvent) return
    await mutations.addAddendum.mutateAsync({ eventId: rulesEvent.id, text })
    setFeedback(t('events.feedback.clarificationAdded'))
    setRulesEvent(null)
  }

  async function confirmTransition() {
    if (!transition) return
    setTransitionError(null)
    try {
      if (transition.action === 'activate')
        await mutations.activateEvent.mutateAsync(transition.event.id)
      else await mutations.finishEvent.mutateAsync(transition.event.id)
      setFeedback(
        t(
          transition.action === 'activate'
            ? 'events.feedback.activated'
            : 'events.feedback.finished',
        ),
      )
      setTransition(null)
    } catch (error) {
      setTransitionError(t(eventErrorKey(error)))
    }
  }

  return {
    feedback,
    form,
    saving: mutations.createEvent.isPending || mutations.updateEvent.isPending,
    openCreate: () => {
      setFeedback(null)
      setForm({ event: null })
    },
    openEdit: (event: BingoEvent) => {
      setFeedback(null)
      setForm({ event })
    },
    closeForm: () => setForm(null),
    rulesEvent,
    savingRules: mutations.updateRules.isPending || mutations.addAddendum.isPending,
    addAddendum,
    openRules: (event: BingoEvent) => {
      setFeedback(null)
      setRulesEvent(event)
    },
    closeRules: () => setRulesEvent(null),
    saveRules,
    save,
    transition,
    transitionError,
    transitioning: mutations.activateEvent.isPending || mutations.finishEvent.isPending,
    openTransition: (event: BingoEvent, action: EventTransition) => {
      setFeedback(null)
      setTransitionError(null)
      setTransition({ event, action })
    },
    closeTransition: () => {
      setTransitionError(null)
      setTransition(null)
    },
    confirmTransition,
  }
}
