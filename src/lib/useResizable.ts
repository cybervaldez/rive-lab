import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_WIDTH = 240
const MAX_WIDTH_RATIO = 0.6

function getInitialWidth(storageKey: string): number {
  if (typeof window === 'undefined') return 340
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    const n = parseInt(stored, 10)
    if (!isNaN(n) && n >= MIN_WIDTH) return n
  }
  return 340
}

export function useResizable(storageKey = 'debug-panel-width') {
  const [width, setWidth] = useState(() => getInitialWidth(storageKey))
  const isResizing = useRef(false)
  const [resizing, setResizing] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    setResizing(true)

    const startX = e.clientX
    const startWidth = getInitialWidth(storageKey)

    const currentWidth = { value: startWidth }

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX - ev.clientX
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO
      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth + delta))
      currentWidth.value = newWidth
      setWidth(newWidth)
    }

    const onMouseUp = () => {
      isResizing.current = false
      setResizing(false)
      localStorage.setItem(storageKey, String(Math.round(currentWidth.value)))
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [storageKey])

  // Clamp width if window resizes
  useEffect(() => {
    const onResize = () => {
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO
      setWidth((w) => Math.min(w, maxWidth))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return { width, isResizing: resizing, handleMouseDown }
}
