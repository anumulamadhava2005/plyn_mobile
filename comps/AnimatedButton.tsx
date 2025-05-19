import React, { forwardRef } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, GestureResponderEvent, ViewStyle, TextStyle } from 'react-native';

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient' | 'men' | 'women' | 'glass';
type Size = 'default' | 'sm' | 'lg' | 'xl' | 'icon';
type Anim = 'none' | 'shine' | 'pulse' | 'underline';

export interface AnimatedButtonProps {
    children: React.ReactNode;
    variant?: Variant;
    size?: Size;
    anim?: Anim;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    disabled?: boolean;
    onPress?: (event: GestureResponderEvent) => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

const variantStyles: Record<Variant, ViewStyle> = {
    default: { backgroundColor: '#007bff' },
    destructive: { backgroundColor: '#dc3545' },
    outline: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
    secondary: { backgroundColor: '#6c757d' },
    ghost: { backgroundColor: 'transparent' },
    link: { backgroundColor: 'transparent' },
    gradient: { backgroundColor: '#ff7e5f' }, // Example, use LinearGradient for real gradient
    men: { backgroundColor: '#3498db' },
    women: { backgroundColor: '#e75480' },
    glass: { backgroundColor: 'rgba(255,255,255,0.2)' },
};

const sizeStyles: Record<Size, ViewStyle> = {
    default: { height: 40, paddingHorizontal: 16 },
    sm: { height: 36, paddingHorizontal: 12 },
    lg: { height: 48, paddingHorizontal: 24 },
    xl: { height: 56, paddingHorizontal: 32 },
    icon: { height: 40, width: 40, justifyContent: 'center', alignItems: 'center' },
};

const textStyles: Record<Variant, TextStyle> = {
    default: { color: '#fff' },
    destructive: { color: '#fff' },
    outline: { color: '#333' },
    secondary: { color: '#fff' },
    ghost: { color: '#333' },
    link: { color: '#007bff', textDecorationLine: 'underline' },
    gradient: { color: '#fff' },
    men: { color: '#fff' },
    women: { color: '#fff' },
    glass: { color: '#fff' },
};

const AnimatedButton = forwardRef<React.ElementRef<typeof TouchableOpacity>, AnimatedButtonProps>(
    (
        {
            children,
            variant = 'default',
            size = 'default',
            anim = 'pulse',
            icon,
            iconPosition = 'left',
            disabled,
            onPress,
            style,
            textStyle,
            ...props
        },
        ref
    ) => {
        return (
            <TouchableOpacity
                ref={ref}
                style={[
                    styles.button,
                    variantStyles[variant],
                    sizeStyles[size],
                    disabled && styles.disabled,
                    style,
                ]}
                activeOpacity={0.8}
                disabled={disabled}
                onPress={onPress}
                {...props}
            >
                <View style={styles.content}>
                    {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
                    <Text style={[styles.text, textStyles[variant], textStyle]}>{children}</Text>
                    {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
                </View>
            </TouchableOpacity>
        );
    }
);

const styles = StyleSheet.create({
    button: {
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        marginVertical: 4,
    },
    disabled: {
        opacity: 0.5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
    text: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export { AnimatedButton };
