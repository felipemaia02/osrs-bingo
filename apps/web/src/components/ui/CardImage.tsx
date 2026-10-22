import { useState } from 'react'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { initialsOf } from '../../lib/text/initials'

interface CardImageProps {
  name: string
  imageUrl?: string | null
  /** Size of the image well, e.g. "h-14 w-full". */
  className: string
  /** Larger fallback for the detail views. */
  large?: boolean
}

/** Image well with the Wiki image, or a shield with the card's initials when unavailable. */
export function CardImage({ name, imageUrl, className, large = false }: CardImageProps) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      className={`flex items-center justify-center overflow-hidden rounded-[3px] bg-rs-inset ${className}`}
    >
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
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
          {initialsOf(name)}
        </span>
      )}
    </span>
  )
}
