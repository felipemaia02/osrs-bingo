import { useState } from 'react'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { tileInitials } from '../boardTiles'
import type { Tile } from '../types'

interface TileImageProps {
  tile: Tile
  /** Size of the image well, e.g. "h-14 w-full". */
  className: string
  /** Larger fallback for the detail views. */
  large?: boolean
}

/** Image well with the Wiki image, or a shield with the tile's initials when unavailable. */
export function TileImage({ tile, className, large = false }: TileImageProps) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      className={`flex items-center justify-center overflow-hidden rounded-[3px] bg-rs-inset ${className}`}
    >
      {tile.imageUrl && !failed ? (
        <img
          src={tile.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span
          className={`flex flex-col items-center font-display font-bold text-rs-border-strong ${
            large ? 'text-base' : 'text-xs'
          }`}
        >
          <ShieldOutlinedIcon sx={{ fontSize: large ? 32 : 18 }} aria-hidden="true" />
          {tileInitials(tile.name)}
        </span>
      )}
    </span>
  )
}
