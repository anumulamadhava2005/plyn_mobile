import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";

type SelectContextProps = {
  value: string | null;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = React.createContext<SelectContextProps | null>(null);

export const Select = ({
  value,
  onValueChange,
  children,
}: {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider
      value={{
        value: value ?? null,
        setValue: (val) => {
          onValueChange(val);
          setOpen(false);
        },
        open,
        setOpen,
      }}
    >
      {children}
    </SelectContext.Provider>
  );
};

export const SelectTrigger = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const context = React.useContext(SelectContext);
  if (!context) return null;

  return (
    <TouchableOpacity
      style={styles.trigger}
      onPress={() => context.setOpen(true)}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", flex: 1 }}>
        {children}
        <Text style={styles.triggerText}>
          {context.value ? context.value : "Select..."}
        </Text>
        <Text style={{ fontSize: 16, color: "#333" }}>▼</Text>
      </View>
    </TouchableOpacity>
  );
};

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const context = React.useContext(SelectContext);
  if (!context) return null;

  const label = context.value ?? placeholder ?? "Select...";
  return <Text style={styles.triggerText}>{label}</Text>;
};

export const SelectContent = ({ children }: { children: React.ReactNode }) => {
  const context = React.useContext(SelectContext);
  if (!context || !context.open) return null;

  return (
    <Modal
      visible={context.open}
      transparent
      animationType="fade"
      onRequestClose={() => context.setOpen(false)}
    >
      <TouchableOpacity
        style={styles.backdrop}
        onPress={() => context.setOpen(false)}
      >
        <View style={styles.modalContent}>{children}</View>
      </TouchableOpacity>
    </Modal>
  );
};

export const SelectGroup = ({ children }: { children: React.ReactNode }) => {
  return <View>{children}</View>;
};

export const SelectItem = ({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) => {
  const context = React.useContext(SelectContext);
  if (!context) return null;

  const selected = context.value === value;

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => context.setValue(value)}
    >
      <Text style={[styles.itemText, selected && styles.selectedText]}>
        {children}
      </Text>
      {selected && (
        <Text style={[styles.itemText, styles.selectedText]}>✓</Text>
        )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  trigger: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  triggerText: {
    fontSize: 14,
    color: "#333",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 30,
    borderRadius: 8,
    padding: 10,
    elevation: 5,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
  selectedText: {
    fontWeight: "bold",
    color: "#4ade80",
  },
});
