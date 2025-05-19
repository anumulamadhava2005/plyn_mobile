import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { cn } from '@/lib/utils';

type ButtonProps = {
  variant?: 'outline' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onPress?: () => void;
  children: React.ReactNode;
  isDisabled?: boolean;
  style?: object; // Added style prop for custom styles
};

const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  className,
  onPress,
  children,
  isDisabled = false,
  style,
}) => {
  const baseStyles = 'flex-row items-center justify-center rounded-md';
  const variantStyles =
    variant === 'outline'
      ? 'border border-gray-300 bg-transparent'
      : 'bg-black text-white';
  const sizeStyles =
    size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-5 py-3 text-lg' : 'px-4 py-2';

  return (
    <TouchableOpacity
      onPress={onPress}
      // Replace className with style. You need to convert your classes to a style object.
      // For demonstration, using a placeholder style. Replace with your actual styles or use a utility.
      style={[{ padding: 10, borderRadius: 6, backgroundColor: variant === 'outline' ? 'transparent' : 'black' }, style]}
      disabled={isDisabled}
    >
      <Text style={{ color: variant === 'outline' ? 'black' : 'white' }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export default Button;
