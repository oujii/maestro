import React, { useState, useRef, useEffect } from 'react';

interface MobileSliderProps {
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
}

const MobileSlider: React.FC<MobileSliderProps> = ({
  min,
  max,
  value,
  onChange,
  className
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Calculate the percentage for positioning
  const getPercentage = (current: number | null) => {
    if (current === null) return 0;
    return ((current - min) / (max - min)) * 100;
  };

  // Calculate the value from a percentage
  const getValueFromPercentage = (percentage: number) => {
    return Math.round(((max - min) * percentage) / 100 + min);
  };

  // Update the thumb position
  const updateThumbPosition = () => {
    if (thumbRef.current && value !== null) {
      const percentage = getPercentage(value);
      thumbRef.current.style.left = `${percentage}%`;
    }
  };

  // Handle touch/mouse events
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setShowTooltip(true);
    setHasInteracted(true);
    updateValueFromPosition(clientX);
  };

  const handleMove = (clientX: number) => {
    if (isDragging) {
      updateValueFromPosition(clientX);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    setTimeout(() => setShowTooltip(false), 1000);
  };

  // Update value based on pointer position
  const updateValueFromPosition = (clientX: number) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
      const newValue = getValueFromPercentage(percentage);
      setDisplayValue(newValue);
      onChange(newValue);
    }
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent pull-to-refresh
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent pull-to-refresh
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove as any, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    } else {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove as any);
      document.removeEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove as any);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Update thumb position when value changes
  useEffect(() => {
    if (value !== null) {
      updateThumbPosition();
      setDisplayValue(value);
    }
  }, [value]);

  // Styles
  const sliderContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    touchAction: 'none', // Prevent default touch actions
  };

  const sliderTrackStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '3px',
  };

  const sliderProgressStyle: React.CSSProperties = {
    position: 'absolute',
    height: '6px',
    backgroundColor: 'rgb(100, 30, 150)',
    borderRadius: '3px',
    width: value !== null ? `${getPercentage(value)}%` : '0%',
    transition: 'width 0.2s ease-out',
  };

  const sliderThumbStyle: React.CSSProperties = {
    position: 'absolute',
    width: '32px',
    height: '32px',
    backgroundColor: 'rgb(100, 30, 150)',
    border: '2px solid white',
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
    transition: isDragging ? 'none' : 'left 0.1s ease-out',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-40px',
    left: value !== null ? `${getPercentage(value)}%` : '0%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgb(100, 30, 150)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    opacity: showTooltip && hasInteracted ? 1 : 0,
    transition: 'opacity 0.2s ease-out',
    pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  };

  return (
    <div
      className={className}
      style={{
        width: '100%',
        padding: '10px 0',
        touchAction: 'none' // Prevent default touch actions
      }}
    >
      <div
        ref={sliderRef}
        style={sliderContainerStyle}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div style={sliderTrackStyle}></div>
        <div style={sliderProgressStyle}></div>
        <div ref={thumbRef} style={sliderThumbStyle}></div>
        <div style={tooltipStyle}>{displayValue}</div>
      </div>
    </div>
  );
};

export default MobileSlider;
