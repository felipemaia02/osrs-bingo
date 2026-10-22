import type { ReactNode } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

interface ThemedMenuProps {
  id: string
  anchorEl: HTMLElement | null
  onClose: () => void
  children: ReactNode
}

/** MUI Menu (focus management, keyboard, Escape) with the RuneScape panel look. */
export function ThemedMenu({ id, anchorEl, onClose, children }: ThemedMenuProps) {
  return (
    <Menu
      id={id}
      anchorEl={anchorEl}
      open={anchorEl !== null}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          className:
            '!mt-1 !min-w-40 !rounded !border !border-rs-border !bg-rs-surface !text-rs-text !shadow-rs-panel',
        },
      }}
    >
      {children}
    </Menu>
  )
}

interface ThemedMenuItemProps {
  onClick: () => void
  selected?: boolean
  disabled?: boolean
  children: ReactNode
}

export function ThemedMenuItem({
  onClick,
  selected = false,
  disabled,
  children,
}: ThemedMenuItemProps) {
  return (
    <MenuItem
      onClick={onClick}
      selected={selected}
      disabled={disabled}
      className={`!min-h-11 !gap-2 !text-sm ${
        selected ? '!bg-rs-raised !font-semibold !text-rs-gold-bright' : '!text-rs-text'
      } hover:!bg-rs-raised`}
    >
      {children}
    </MenuItem>
  )
}
