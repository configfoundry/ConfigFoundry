'use client'

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Ctrl', 'K'], description: 'Focus search (⌘K on macOS)' },
  { keys: ['/'], description: 'Focus search' },
  { keys: ['↑', '↓'], description: 'Move through search results' },
  { keys: ['↵'], description: 'Open the highlighted result' },
  { keys: ['Esc'], description: 'Close search or this dialog' },
  { keys: ['?'], description: 'Show this shortcuts list' },
]

/** A small "?" shortcuts cheat-sheet, in the style of Kubernetes/GitHub docs. */
export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal docs-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Keyboard shortcuts</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <ul className="docs-shortcuts-list">
            {SHORTCUTS.map((s) => (
              <li key={s.description}>
                <span className="docs-shortcuts-keys">
                  {s.keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </span>
                <span>{s.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
