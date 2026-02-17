import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_HEIGHT = 150
const MAX_HEIGHT_RATIO = 0.6

function getInitialHeight(storageKey: string, defaultHeight: number): number {
  if (typeof window === 'undefined') return defaultHeight
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    const n = parseInt(stored, 10)
    if (!isNaN(n) && n >= MIN_HEIGHT) return n
  }
  return defaultHeight
}

export function useResizableHeight(storageKey = 'debug-panel-height', defaultHeight = 300) {
  const [height, setHeight] = useState(() => getInitialHeight(storageKey, defaultHeight))
  const isResizing = useRef(false)
  const [resizing, setResizing] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current = true
    setResizing(true)

    const startY = e.clientY
    const startHeight = getInitialHeight(storageKey, defaultHeight)

    const currentHeight = { value: startHeight }

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startY - ev.clientY // dragging up increases height
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO
      const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight + delta))
      currentHeight.value = newHeight
      setHeight(newHeight)
    }

    const onMouseUp = () => {
      isResizing.current = false
      setResizing(false)
      localStorage.setItem(storageKey, String(Math.round(currentHeight.value)))
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [storageKey, defaultHeight])

  // Clamp height if window resizes
  useEffect(() => {
    const onResize = () => {
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO
      setHeight((h) => Math.min(h, maxHeight))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return { height, isResizing: resizing, handleMouseDown }
}
