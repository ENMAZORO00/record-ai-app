import React from 'react';
import Svg, { G, Path, Defs, LinearGradient, Stop, ClipPath, Rect } from 'react-native-svg';

let gradientId = 0;
let clipId = 0;

export default function LogoIcon({ size = 128, ...props }) {
  const gId = `paint0_linear_${++gradientId}`;
  const cId = `clip0_${++clipId}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none" {...props}>
      <G clipPath={`url(#${cId})`}>
        <Path
          d="M64 128C99.3462 128 128 99.3462 128 64C128 28.6538 99.3462 0 64 0C28.6538 0 0 28.6538 0 64C0 99.3462 28.6538 128 64 128Z"
          fill={`url(#${gId})`}
        />
        <G opacity="0.95">
          <Path
            opacity="0.85"
            d="M34 64C34 54.3333 34.8056 49.5 36.4167 49.5C38.0278 49.5 38.8333 54.3333 38.8333 64C38.8333 73.6667 38.0278 78.5 36.4167 78.5C34.8056 78.5 34 73.6667 34 64Z"
            fill="white"
          />
          <Path
            opacity="0.95"
            d="M43.668 64C43.668 49.5 44.4735 42.25 46.0846 42.25C47.6957 42.25 48.5013 49.5 48.5013 64C48.5013 78.5 47.6957 85.75 46.0846 85.75C44.4735 85.75 43.668 78.5 43.668 64Z"
            fill="white"
          />
          <Path
            d="M53.332 64C53.332 44.6667 54.1376 35 55.7487 35C57.3598 35 58.1654 44.6667 58.1654 64C58.1654 83.3333 57.3598 93 55.7487 93C54.1376 93 53.332 83.3333 53.332 64Z"
            fill="white"
          />
        </G>
        <G opacity="0.95">
          <Path
            opacity="0.85"
            d="M93.082 64.0004C93.082 73.1668 92.3182 77.75 90.7904 77.75C89.2627 77.75 88.4988 73.1668 88.4988 64.0004C88.4988 54.834 89.2627 50.2508 90.7904 50.2508C92.3182 50.2508 93.082 54.834 93.082 64.0004Z"
            fill="white"
          />
          <Path
            opacity="0.95"
            d="M83.9141 64.0006C83.9141 77.7502 83.1502 84.625 81.6225 84.625C80.0947 84.625 79.3309 77.7502 79.3309 64.0006C79.3309 50.251 80.0947 43.3762 81.6225 43.3762C83.1502 43.3762 83.9141 50.251 83.9141 64.0006Z"
            fill="white"
          />
          <Path
            d="M74.75 64.0008C74.75 82.3336 73.9861 91.5 72.4584 91.5C70.9307 91.5 70.1668 82.3336 70.1668 64.0008C70.1668 45.668 70.9307 36.5016 72.4584 36.5016C73.9861 36.5016 74.75 45.668 74.75 64.0008Z"
            fill="white"
          />
        </G>
      </G>
      <Defs>
        <LinearGradient
          id={gId}
          x1="20"
          y1="20"
          x2="108"
          y2="108"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#3B82F6" />
          <Stop offset="0.5" stopColor="#2563EB" />
          <Stop offset="1" stopColor="#1E40AF" />
        </LinearGradient>
        <ClipPath id={cId}>
          <Rect width="128" height="128" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}
