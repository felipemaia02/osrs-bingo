import { useCallback, useState } from 'react'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'

interface LoadingImageProps {
  src: string
  alt: string
  /** Classes of the `<img>` itself (size and fit inside the well). */
  className: string
  /** Called when the image can't be loaded, so the caller shows its fallback. */
  onFail: () => void
  lazy?: boolean
}

/**
 * Shows a pulsing placeholder until the image has fully loaded, then fades it in (feature
 * 053). Fills its parent's image well; a new `src` starts loading again.
 */
export function LoadingImage(props: LoadingImageProps) {
  return <ImageWithPlaceholder key={props.src} {...props} />
}

function ImageWithPlaceholder({ src, alt, className, onFail, lazy = false }: LoadingImageProps) {
  const [loaded, setLoaded] = useState(false)
  // Images already in the browser cache may finish before React attaches `onLoad`.
  const checkCached = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth > 0) setLoaded(true)
  }, [])
  return (
    <span aria-busy={!loaded} className="relative flex h-full w-full items-center justify-center">
      {!loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-rs-raised/60 text-rs-border-strong motion-safe:animate-pulse"
        >
          <ImageOutlinedIcon fontSize="small" />
        </span>
      )}
      <img
        ref={checkCached}
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : undefined}
        onLoad={() => setLoaded(true)}
        onError={onFail}
        className={`${className} motion-safe:transition-opacity motion-safe:duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  )
}
