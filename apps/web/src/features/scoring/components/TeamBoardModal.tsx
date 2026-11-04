import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormModal } from '../../../components/ui/FormModal'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { useIsDesktop } from '../../../hooks/useIsDesktop'
import { boardToTiles } from '../../bingo/boardTiles'
import { BingoBoard } from '../../bingo/components/BingoBoard'
import { MiniMap } from '../../bingo/components/MiniMap'
import { TileDetailContent } from '../../bingo/components/TileDetailContent'
import { TileDetailPanel } from '../../bingo/components/TileDetailPanel'
import { TileWorkersSection } from '../../bingo/components/TileWorkersSection'
import { useAdminTeamActivity } from '../../bingo/hooks/useTileActivity'
import type { Tile } from '../../bingo/types'
import { useAdminBoard } from '../../boards/hooks/useBoards'
import { useTeamScore } from '../hooks/useScoring'
import type { RankingTeam } from '../types'
import { TeamScorePanel } from './TeamScorePanel'

// Admins always get progress; this key only shows if a tile somehow has none.
const PROGRESS_UNAVAILABLE = 'board.progress.unavailable'

interface TeamBoardModalProps {
  eventId: string
  /** In ranking order; the switcher lists them all. */
  teams: RankingTeam[]
  initialTeamId: string
  onClose: () => void
}

/** A team's board with its progress, opened from the admin ranking (feature 058). */
export function TeamBoardModal({ eventId, teams, initialTeamId, onClose }: TeamBoardModalProps) {
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const [teamId, setTeamId] = useState(initialTeamId)
  // Kept across team switches: the same square can be compared between teams.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const board = useAdminBoard(eventId)
  const score = useTeamScore(eventId, teamId)
  const activity = useAdminTeamActivity(eventId, teamId)
  const team = teams.find((candidate) => candidate.team_id === teamId)
  const tiles = useMemo(
    () => (board.data && score.data ? boardToTiles(board.data, score.data, activity.data) : []),
    [board.data, score.data, activity.data],
  )
  const selected = tiles.find((tile) => tile.id === selectedId) ?? null
  const toggle = (tile: Tile) => setSelectedId(tile.id === selectedId ? null : tile.id)
  // Read-only: admins see who works on the tile but can't mark it (061).
  const workers = selected?.workers ? <TileWorkersSection tile={selected} eventId={null} /> : null

  return (
    <FormModal
      title={t('ranking.board.title', { team: team?.team_name ?? '' })}
      size="xl"
      busy={false}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {teams.length > 1 && (
          <SegmentedControl<string>
            label={t('ranking.team')}
            variant="chip"
            value={teamId}
            onChange={setTeamId}
            options={teams.map((item) => ({ value: item.team_id, label: item.team_name }))}
          />
        )}
        {board.isLoading || score.isLoading ? (
          <p role="status" className="m-0 text-rs-muted">
            {t('common.loading')}
          </p>
        ) : board.isError || score.isError || !board.data || !score.data ? (
          <p role="alert" className="m-0">
            {t('common.apiError')}
          </p>
        ) : (
          <>
            <TeamScorePanel score={score.data} compact />
            {isDesktop ? (
              <div className="flex items-start gap-4">
                <BingoBoard
                  tiles={tiles}
                  size={board.data.size}
                  matches={null}
                  selectedId={selectedId}
                  onSelect={toggle}
                />
                <TileDetailPanel
                  tile={selected}
                  unavailableReason={PROGRESS_UNAVAILABLE}
                  onClose={() => setSelectedId(null)}
                  extra={workers}
                />
              </div>
            ) : (
              <>
                <MiniMap
                  tiles={tiles}
                  size={board.data.size}
                  matches={null}
                  summary={null}
                  currentId={selectedId}
                  onSelect={toggle}
                />
                {selected && (
                  <section
                    aria-label={selected.name}
                    className="rounded border border-rs-border bg-rs-surface"
                  >
                    <h3 className="m-0 border-b border-rs-border px-3.5 py-3 font-display text-lg text-rs-gold-bright">
                      {selected.name}
                    </h3>
                    <TileDetailContent
                      tile={selected}
                      unavailableReason={PROGRESS_UNAVAILABLE}
                      extra={workers}
                    />
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </FormModal>
  )
}
