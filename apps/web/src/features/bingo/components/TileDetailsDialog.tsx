import { FormModal } from '../../../components/ui/FormModal'
import type { Tile, TileMatch } from '../types'
import { TileDetailContent } from './TileDetailContent'

/** Mobile tile details. MUI Modal restores focus to the list item that opened it. */
export function TileDetailsDialog({
  tile,
  match,
  onClose,
}: {
  tile: Tile
  match?: TileMatch
  onClose: () => void
}) {
  return (
    <FormModal title={tile.name} busy={false} onClose={onClose}>
      <div className="-m-5 overflow-hidden">
        <TileDetailContent tile={tile} match={match} showName={false} />
      </div>
    </FormModal>
  )
}
