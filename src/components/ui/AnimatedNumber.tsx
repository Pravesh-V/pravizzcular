import { useEffect, useRef, useState } from 'react';

import { useMotion } from '@/theme';

import { Text, type TextProps } from './Text';

interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  value: number;
  /** Decimal places in the rendered output. */
  precision?: number;
  /** Rendered before/after the number, e.g. '%' or 'kg'. */
  suffix?: string;
  prefix?: string;
  /** Thousands separators. */
  grouped?: boolean;
  durationMs?: number;
}

/**
 * Counts up to `value` on change.
 *
 * Driven on the JS thread rather than by Reanimated because the animated
 * quantity is text content, not a style. With reduced motion the target is
 * rendered directly and no animation state is involved at all.
 */
export function AnimatedNumber({
  value,
  precision = 0,
  suffix = '',
  prefix = '',
  grouped = true,
  durationMs,
  ...textProps
}: AnimatedNumberProps) {
  const motion = useMotion();
  const target = Number.isFinite(value) ? value : 0;

  const runDuration = durationMs ?? motion.duration('slow');
  const animate = !motion.reduceMotion && runDuration > 0;

  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    if (from === target) return;

    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / runDuration, 1);
      // Ease-out cubic: fast start, gentle settle.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);

      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      fromRef.current = target;
    };
  }, [target, runDuration, animate]);

  // Without animation the value is rendered straight through, so there is no
  // window in which stale state could be shown.
  const shown = animate ? display : target;

  const rounded = shown.toFixed(precision);
  const formatted = grouped
    ? Number(rounded).toLocaleString('en-US', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      })
    : rounded;

  return (
    <Text numeric {...textProps}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}
