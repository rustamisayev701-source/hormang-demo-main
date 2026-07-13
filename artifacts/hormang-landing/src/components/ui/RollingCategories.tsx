import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Item = { emoji: string; name: string };

type Props = {
  items: Item[];
  interval?: number;
  onClick?: (name: string) => void;
};

export function RollingCategories({ items, interval = 3000, onClick }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, interval, paused]);

  const current = items[index];

  return (
    <div
      className="relative h-[46px] w-[56px] overflow-hidden flex flex-col items-center justify-center cursor-pointer flex-shrink-0"
      onClick={() => onClick?.(current.name)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={index}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.38, ease: "easeInOut" }}
          className="absolute flex flex-col items-center gap-0.5"
        >
          <span className="text-[22px] leading-none">{current.emoji}</span>
          <span className="text-[9px] font-semibold text-blue-600 whitespace-nowrap leading-tight">
            {current.name}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
