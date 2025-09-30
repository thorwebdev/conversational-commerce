import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface OrbProps {
  size?: "small" | "large" | number;
  isAnimated?: boolean;
  isSpeaking?: boolean;
  volumeLevel?: number; // 0-1 scale
  className?: string;
}

export function Orb({
  size = "large",
  isAnimated = false,
  isSpeaking = false,
  volumeLevel = 0,
  className = ""
}: OrbProps) {
  // Convert size to actual dimensions
  const sizeMap = {
    small: "w-11 h-11",
    large: "w-32 h-32"
  };

  const sizeClass = typeof size === "number"
    ? `w-${size} h-${size}`
    : sizeMap[size];

  const baseClasses = `${sizeClass} rounded-full bg-cover bg-center bg-no-repeat ${className}`;

  const backgroundStyle = {
    backgroundImage: "url('/Avatar.png')"
  };

  const scale = useMotionValue(1);

  useEffect(() => {
    if (isAnimated && isSpeaking && volumeLevel > 0) {
      // Volume-based animation: scale based on audio level
      // Map volume (0-1) to scale (1.0 to 1.25)
      const targetScale = 1 + (volumeLevel * 0.25);
      animate(scale, targetScale, {
        duration: 0.1,
        ease: "easeOut"
      });
    } else if (isAnimated && isSpeaking) {
      // Fallback to gentle pulse if no volume data
      animate(scale, [1, 1.08, 1], {
        duration: 0.5,
        repeat: Infinity,
        ease: "easeInOut"
      });
    } else if (isAnimated) {
      // Idle breathing animation
      animate(scale, [1, 1.03, 1], {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      });
    }
  }, [isAnimated, isSpeaking, volumeLevel, scale]);

  if (isAnimated) {
    return (
      <motion.div
        className={baseClasses}
        style={{ ...backgroundStyle, transform: `scale(${scale.get()})` }}
      />
    );
  }

  return (
    <div
      className={baseClasses}
      style={backgroundStyle}
    />
  );
}
