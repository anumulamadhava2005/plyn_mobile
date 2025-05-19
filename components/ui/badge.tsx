import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Text, View } from "react-native";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        completed:
          "border-transparent bg-completed text-completed-foreground hover:bg-completed/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "completed";
}

import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  default: {
    backgroundColor: "#3b82f6", // Example primary color
    borderColor: "transparent",
    color: "#fff",
  },
  secondary: {
    backgroundColor: "gold", // Example secondary color
    borderColor: "transparent",
    color: "#111827",
  },
  completed: {
    backgroundColor: "#10b981", // Example completed color
    borderColor: "transparent",
    color: "#fff",
  },
  destructive: {
    backgroundColor: "#ef4444", // Example destructive color
    borderColor: "transparent",
    color: "#fff",
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: "#111827",
    color: "#111827",
  },
});

function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <React.Fragment>
      <View style={[styles.base, styles[variant]]}>
        <Text style={{color: 'white'}}>{children}</Text>
      </View>
    </React.Fragment>
  );
}

export { Badge, badgeVariants }
