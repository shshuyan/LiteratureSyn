import { useEffect, useState } from 'react';

interface TouchFriendlyOptions {
  enableHapticFeedback?: boolean;
  touchDelay?: number;
}

export function useTouchFriendly(options: TouchFriendlyOptions = {}) {
  const { enableHapticFeedback = true, touchDelay = 0 } = options;
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect if device supports touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const handleTouchFeedback = () => {
    if (enableHapticFeedback && 'vibrate' in navigator && isTouchDevice) {
      // Light haptic feedback for touch interactions
      navigator.vibrate(10);
    }
  };

  const createTouchHandler = (callback: () => void) => {
    return () => {
      handleTouchFeedback();
      if (touchDelay > 0) {
        setTimeout(callback, touchDelay);
      } else {
        callback();
      }
    };
  };

  return {
    isTouchDevice,
    handleTouchFeedback,
    createTouchHandler,
  };
}

// Hook for managing touch-friendly button interactions
export function useTouchButton(onClick: () => void, options: TouchFriendlyOptions = {}) {
  const { createTouchHandler } = useTouchFriendly(options);
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    setIsPressed(true);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleClick = createTouchHandler(onClick);

  return {
    isPressed,
    buttonProps: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onClick: handleClick,
      className: `touch-manipulation select-none ${isPressed ? 'scale-95' : ''}`,
      style: { 
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.1s ease-out',
      },
    },
  };
}