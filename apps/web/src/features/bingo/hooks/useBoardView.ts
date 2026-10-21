import { useState } from 'react'
import type { BoardView } from '../types'

const STORAGE_KEY = 'osrs-bingo-board-view'
/** Matches Tailwind's `sm` breakpoint: below it the list view is the default. */
const SMALL_SCREEN_QUERY = '(max-width: 639px)'

function readStoredView(): BoardView | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'grid' || stored === 'list' ? stored : null
  } catch {
    return null
  }
}

function defaultView(): BoardView {
  const small =
    typeof window.matchMedia === 'function' && window.matchMedia(SMALL_SCREEN_QUERY).matches
  return small ? 'list' : 'grid'
}

/** Grid/list preference remembered on this device; storage failures fall back silently. */
export function useBoardView(): [BoardView, (view: BoardView) => void] {
  const [view, setView] = useState<BoardView>(() => readStoredView() ?? defaultView())

  function changeView(next: BoardView) {
    setView(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable (private mode, blocked): keep the choice for this visit only.
    }
  }

  return [view, changeView]
}
