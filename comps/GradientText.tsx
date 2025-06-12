// components/GradientText.tsx
import { useFonts } from 'expo-font';
import React from 'react';
import { Text } from 'react-native';
import { ActivityIndicator } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

export default function GradientText({ text, fontSize = 80 }: { text: string; fontSize?: number }) {
    const [fontsLoaded] = useFonts({
      Speedy: require('@/assets/fonts/SpeedyRegular-7BLoE.ttf'),
    });

    if(!fontsLoaded) return (
      <ActivityIndicator size={'large'} color='black' />
    )
  return (
    <Svg height={fontSize + 20} width="100%">
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FF69B4" />
          <Stop offset="100%" stopColor="#8A2BE2" />
        </LinearGradient>
      </Defs>
      <SvgText
        fill="url(#grad)"
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily='Speedy'
        x="50%"
        y={fontSize}
        textAnchor="middle"
      >
        {text}
      </SvgText>
    </Svg>
  );
}
