import React, { useState, useRef, useEffect } from 'react'

function polarToCartesian(cx, cy, r, angleFromTop) {
  const rad = ((angleFromTop - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

const TRACK_ARC = describeArc(28, 28, 22, -135, 135)

export function Knob({
  label,
  value = 50,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  color = '#d9822b',
  unit = '',
  disabled = false,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const startYRef = useRef(0)
  const startValRef = useRef(value)
  const lastValRef = useRef(value)
  const inputRef = useRef(null)

  useEffect(() => {
    setEditValue(String(value))
    lastValRef.current = value
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const angle = ratio * 270 - 135
  const valueArc = angle > -134 ? describeArc(28, 28, 22, -135, angle) : null

  const updateValueFromDelta = (deltaY) => {
    const range = max - min
    const deltaVal = (deltaY / 140) * range
    let newVal = Math.round(startValRef.current + deltaVal)
    newVal = Math.max(min, Math.min(max, newVal))
    if (onChange && newVal !== lastValRef.current) {
      lastValRef.current = newVal
      onChange(newVal)
    }
  }

  const handleMouseDown = (e) => {
    if (disabled || isEditing) return
    setIsDragging(true)
    startYRef.current = e.clientY
    startValRef.current = value
    lastValRef.current = value

    const handleMouseMove = (moveEvent) => {
      updateValueFromDelta(startYRef.current - moveEvent.clientY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (e) => {
    if (disabled || isEditing || e.touches.length !== 1) return
    setIsDragging(true)
    startYRef.current = e.touches[0].clientY
    startValRef.current = value
    lastValRef.current = value

    const handleTouchMove = (moveEvent) => {
      if (moveEvent.touches.length !== 1) return
      moveEvent.preventDefault()
      updateValueFromDelta(startYRef.current - moveEvent.touches[0].clientY)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)
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

  const sizeClass = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12 sm:w-14 sm:h-14',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
  }[size] || 'w-12 h-12 sm:w-14 sm:h-14'

  return (
    <div
      className={`flex flex-col items-center gap-0.5 select-none ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9a968e] truncate max-w-[78px]">
        {label}
      </span>

      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
        onDoubleClick={() => !disabled && setIsEditing(true)}
        className={`${sizeClass} cursor-ns-resize touch-none transition-transform ${
          isDragging ? 'scale-105' : ''
        }`}
        title={`${label}: ${value}${unit}`}
      >
        <svg viewBox="0 0 56 56" className="w-full h-full overflow-visible">
          {/* Outer well */}
          <circle cx="28" cy="28" r="24" fill="#060607" />
          {/* Background track arc */}
          <path
            d={TRACK_ARC}
            fill="none"
            stroke="#1e1e22"
            strokeWidth="3.5"
            strokeLinecap="butt"
          />
          {/* Active value arc */}
          {valueArc && (
            <path
              d={valueArc}
              fill="none"
              stroke={disabled ? '#38383e' : color}
              strokeWidth="3.5"
              strokeLinecap="butt"
            />
          )}
          {/* Concentric flat hardware cap */}
          <circle cx="28" cy="28" r="18" fill="#151518" />
          <circle cx="28" cy="28" r="14" fill="#202024" />
          {/* Crisp pointer */}
          <path
            d="M28 28V14"
            stroke="#f2efe9"
            strokeWidth="2.4"
            strokeLinecap="round"
            style={{
              transformOrigin: '28px 28px',
              transform: `rotate(${angle}deg)`,
            }}
          />
        </svg>
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCommitEdit}
          onKeyDown={handleKeyDown}
          className="w-12 text-center font-display text-lg bg-[#060607] text-[#e5a93c] outline outline-2 outline-[#d9822b] px-1 py-0"
        />
      ) : (
        <span
          onClick={() => !disabled && setIsEditing(true)}
          className="font-display text-lg text-[#f2efe9] tabular-nums cursor-text hover:text-[#e5a93c] leading-none pt-0.5"
        >
          {value}{unit}
        </span>
      )}
    </div>
  )
}
