import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EventSelectionState {
  selectedEventId: string | null
  selectEvent: (eventId: string) => void
  clearSelection: () => void
}

export const useEventSelectionStore = create<EventSelectionState>()(
  persist(
    (set) => ({
      selectedEventId: null,
      selectEvent: (eventId) => set({ selectedEventId: eventId }),
      clearSelection: () => set({ selectedEventId: null }),
    }),
    { name: 'osrs-bingo-current-event' },
  ),
)
