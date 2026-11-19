import React, { useState, useRef, useEffect } from 'react'

export function Knob({
  label,
  value = 50,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  color = '#e67e22',
  unit = '',
  disabled = false,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const startYRef = useRef(0)
  const startValRef = useRef(value)
  const inputRef = useRef(null)

  useEffect(() => {
    setEditValue(String(value))
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Map 0..100 to -135deg .. +135deg
  const angle = ((value - min) / (max - min)) * 270 - 135

  const handleMouseDown = (e) => {
    if (disabled || isEditing) return
    setIsDragging(true)
    startYRef.current = e.clientY
    startValRef.current = value

    const handleMouseMove = (moveEvent) => {
      const deltaY = startYRef.current - moveEvent.clientY
      const range = max - min
      const deltaVal = (deltaY / 140) * range
      let newVal = Math.round(startValRef.current + deltaVal)
      newVal = Math.max(min, Math.min(max, newVal))
      if (onChange) {
        onChange(newVal)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleWheel = (e) => {
    if (disabled) return
    e.preventDefault()
    const delta = e.deltaY < 0 ? step : -step
    const newVal = Math.max(min, Math.min(max, value + delta))
    if (onChange && newVal !== value) {
      onChange(newVal)
    }
  }

  const handleCommitEdit = () => {
    setIsEditing(false)
    const num = parseInt(editValue, 10)
    if (!isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, num))
      if (onChange) onChange(clamped)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommitEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(String(value))
    }
  }

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-13 h-13',
  }[size] || 'w-11 h-11'

  return (
    <div
      className={`flex flex-col items-center gap-1 select-none ${
        disabled ? 'opacity-35 pointer-events-none' : ''
      }`}
    >
      <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase truncate max-w-[72px]">
        {label}
      </span>

      <div
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onDoubleClick={() => !disabled && setIsEditing(true)}
        className={`relative ${sizeClasses} rounded-full cursor-ns-resize flex items-center justify-center transition-transform ${
          isDragging ? 'scale-105' : 'hover:scale-[1.03]'
        }`}
        style={{
          background: 'radial-gradient(circle at 40% 40%, #262930 0%, #121418 100%)',
          boxShadow: '0 3px 6px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -2px 3px rgba(0,0,0,0.9)',
          border: '1px solid #2e333d'
        }}
        title={`${label}: ${value}${unit} (Arraste ou dê duplo clique para editar)`}
      >
        {/* Subtle rotary pointer line */}
        <div
          className="absolute w-full h-full flex justify-center items-start pt-1 pointer-events-none transition-transform duration-75"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div
            className="w-0.5 h-2.5 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 5px ${color}`
            }}
          />
        </div>

        {/* Center metallic cap */}
        <div className="w-4 h-4 rounded-full bg-[#181a1f] shadow-inner border border-neutral-700/60" />
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCommitEdit}
          onKeyDown={handleKeyDown}
          className="w-11 text-center text-[10px] font-mono font-bold bg-neutral-900 text-amber-400 border border-amber-500 rounded px-0.5 py-0.5 outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => !disabled && setIsEditing(true)}
          className="text-[10px] font-mono font-bold text-neutral-300 bg-neutral-900/90 hover:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-800 cursor-text"
        >
          {value}{unit}
        </span>
      )}
    </div>
  )
}
