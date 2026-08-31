/**
 * Motion primitives — Reanimated (UI thread, adaptive to device refresh rate).
 * 120Hz ProMotion / 60Hz standard: the shared-value worklet runs on the display
 * cadence, so every animation below is as smooth as the screen allows.
 */
import React, { ReactNode, useEffect } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  cancelAnimation,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, spacing } from '../../theme/theme';

/** A Pressable that springs instead of snapping — use for every tappable control. */
export const PressableScale: React.FC<
  PressableProps & { activeScale?: number; springConfig?: object }
> = ({ style, activeScale = 0.955, springConfig, onPressIn, onPressOut, children, ...rest }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...rest}
        onPressIn={(e) => {
          scale.value = withSpring(activeScale, springConfig || { damping: 18, stiffness: 320 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, springConfig || { damping: 16, stiffness: 280 });
          onPressOut?.(e);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

/** Expanding-and-fading halo ring. Used for the mic and the vessel beacon. */
export const PulseRing: React.FC<{
  color: string;
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ color, size = 72, active = true, style }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 0.6;
      return;
    }
    scale.value = withRepeat(withTiming(1.45, { duration: 1300, easing: Easing.out(Easing.cubic) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1300, easing: Easing.out(Easing.cubic) }), -1, false);
  }, [active, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

/** Three staggered "scanning" dots for the thinking state. */
const ThinkingDot: React.FC<{ progress: Animated.SharedValue<number>; offset: number; color: string }> = ({
  progress,
  offset,
  color,
}) => {
  const dotStyle = useAnimatedStyle(() => {
    const p = progress.value + offset;
    return {
      transform: [
        { translateY: p * 4 },
        { scale: 1 + Math.max(0, p) * 0.12 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { width: 7, height: 7, borderRadius: 4, backgroundColor: color },
        dotStyle,
      ]}
    />
  );
};

export const ThinkingDots: React.FC<{ color?: string }> = ({ color = colors.aqua }) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 350, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 350, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
    );
  }, [progress]);

  return (
    <Animated.View style={{ flexDirection: 'row', gap: 6 }}>
      {[0, 0.04, 0.08].map((off, i) => (
        <ThinkingDot key={i} progress={progress} offset={off} color={color} />
      ))}
    </Animated.View>
  );
};

/** One-frame-per-display-aware enter helpers. */
export const FadeInDownView: React.FC<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}> = ({ delay = 0, style, children }) => (
  <Animated.View
    style={style}
    entering={FadeInDown.delay(delay).springify().damping(16).stiffness(180)}
  >
    {children}
  </Animated.View>
);

export const FadeInView: React.FC<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}> = ({ delay = 0, style, children }) => (
  <Animated.View style={style} entering={FadeIn.delay(delay)}>
    {children}
  </Animated.View>
);

export const SlideUpSheet: React.FC<{ visible: boolean; children: ReactNode }> = ({
  visible,
  children,
}) => {
  return visible ? (
    <Animated.View
      entering={SlideInUp.springify().damping(20).stiffness(200)}
      exiting={SlideInDown.springify().damping(20).stiffness(200)}
    >
      {children}
    </Animated.View>
  ) : null;
};

export const FadeInUpView: React.FC<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}> = ({ delay = 0, style, children }) => (
  <Animated.View
    style={style}
    entering={FadeInUp.delay(delay).springify().damping(17).stiffness(190)}
  >
    {children}
  </Animated.View>
);

/** Smooth color cross-fade chip for state badges. */
export const AnimatedPill: React.FC<{
  colorOn: string;
  colorOff: string;
  active: boolean;
  children: ReactNode;
}> = ({ colorOn, colorOff, active, children }) => {
  const t = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    t.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, t]);
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [colorOff, colorOn]),
  }));
  return <Animated.View style={[styles.pill, animatedStyle]}>{children}</Animated.View>;
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
});