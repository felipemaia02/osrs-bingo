import { useState } from 'react'
import type { BoardView } from '../types'

const STORAGE_KEY = 'osrs-bingo-board-view'
const DEFAULT_VIEW: BoardView = 'grid'

function readStoredView(): BoardView | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'grid' || stored === 'list' ? stored : null
  } catch {
    return null
  }
}

/** Desktop grid/list preference remembered on this device; storage failures fall back silently. */
export function useBoardView(): [BoardView, (view: BoardView) => void] {
  const [view, setView] = useState<BoardView>(() => readStoredView() ?? DEFAULT_VIEW)

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
