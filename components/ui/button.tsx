import React from "react"
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  View,
} from "react-native"

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
type Size = "default" | "sm" | "lg" | "icon"

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant
  size?: Size
  asChild?: boolean // Not applicable in React Native, but preserved for API compatibility
  children: React.ReactNode
  isDisabled?: boolean
}

const Button: React.FC<ButtonProps> = ({
  variant = "default",
  size = "default",
  isDisabled = false,
  children,
  style,
  ...props
}) => {
  const variantStyle = getVariantStyle(variant)
  const sizeStyle = getSizeStyle(size)

  return (
    <TouchableOpacity
      style={[styles.base, variantStyle.container, sizeStyle.container, style]}
      {...props}
      disabled={isDisabled}
    >
      <Text style={[styles.text, variantStyle.text, sizeStyle.text]}>{children}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    flexDirection: "row",
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
})

const getVariantStyle = (variant: Variant): { container: ViewStyle; text: TextStyle } => {
  switch (variant) {
    case "destructive":
      return {
        container: { backgroundColor: "#ef4444" }, // red-500
        text: { color: "#ffffff" },
      }
    case "outline":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: "#d1d5db", // gray-300
        },
        text: { color: "#111827" }, // gray-900
      }
    case "secondary":
      return {
        container: { backgroundColor: "#e5e7eb" }, // gray-200
        text: { color: "#111827" },
      }
    case "ghost":
      return {
        container: { backgroundColor: "transparent" },
        text: { color: "#374151" }, // gray-700
      }
    case "link":
      return {
        container: { backgroundColor: "transparent" },
        text: { color: "#3b82f6", textDecorationLine: "underline" }, // blue-500
      }
    case "default":
    default:
      return {
        container: { backgroundColor: "#3b82f6" }, // blue-500
        text: { color: "#ffffff" },
      }
  }
}

const getSizeStyle = (size: Size): { container: ViewStyle; text: TextStyle } => {
  switch (size) {
    case "sm":
      return {
        container: { paddingVertical: 6, paddingHorizontal: 12, height: 36 },
        text: { fontSize: 13 },
      }
    case "lg":
      return {
        container: { paddingVertical: 10, paddingHorizontal: 20, height: 44 },
        text: { fontSize: 16 },
      }
    case "icon":
      return {
        container: { width: 40, height: 40, padding: 0 },
        text: { fontSize: 0 }, // No text
      }
    case "default":
    default:
      return {
        container: { paddingVertical: 8, paddingHorizontal: 16, height: 40 },
        text: { fontSize: 14 },
      }
  }
}

export { Button }
