import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text } from 'react-native-svg';

// Professional gradient: deep indigo → violet
const GRADIENT_COLORS = [
  { offset: '0%', color: '#1e3a8a' },
  { offset: '50%', color: '#4f46e5' },
  { offset: '100%', color: '#7c3aed' },
];

// Unique ID to avoid conflicts when multiple instances render
let gradientId = 0;

export default function GradientText({ children, style }) {
  const id = `logoGrad-${++gradientId}`;
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 32;
  const letterSpacing = StyleSheet.flatten(style)?.letterSpacing ?? -0.5;
  const width = 280;
  const height = fontSize + 20;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            {GRADIENT_COLORS.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity="1" />
            ))}
          </LinearGradient>
        </Defs>
        <Text
          fill={`url(#${id})`}
          fontSize={fontSize}
          fontWeight="900"
          x={width / 2}
          y={height / 2 + fontSize / 3}
          textAnchor="middle"
          letterSpacing={letterSpacing}
        >
          {children}
        </Text>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
});
