import React from 'react';
import { View, Text, ViewProps, TextProps } from 'react-native';
import { cn } from '@/lib/utils';

type RNViewProps = ViewProps & { className?: string };
type RNTextProps = TextProps & { className?: string };

const Card = React.forwardRef<View, RNViewProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    style={props.style}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<View, RNViewProps>(({ className, style, ...props }, ref) => (
  <View
    ref={ref}
    style={[
      { flexDirection: 'column', gap: 6, padding: 24 }, // Adjust gap and padding as needed
      style,
    ]}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<Text, RNTextProps>(({ className, style, ...props }, ref) => (
  <Text
    ref={ref}
    style={style}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<Text, RNTextProps>(({ className, style, ...props }, ref) => (
  <Text
    ref={ref}
    style={style}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<View, RNViewProps>(({ className, style, ...props }, ref) => (
  <View
    ref={ref}
    style={style}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<View, RNViewProps>(({ className, style, ...props }, ref) => (
  <View
    ref={ref}
    style={[{ flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 0 }, style]}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
