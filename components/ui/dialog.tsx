import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';

// ========== DialogTrigger ==========
type DialogTriggerProps = {
  children: React.ReactNode;
  asChild?: boolean; // We accept it but do nothing
};

export const DialogTrigger = ({ children }: DialogTriggerProps) => {
  return (
    <TouchableOpacity >
      {children}
    </TouchableOpacity>
  );
};


// ========== DialogContent ==========
export const DialogContent = ({ children }: { children: React.ReactNode }) => {
  return <View style={styles.content}>{children}</View>;
};

// ========== Dialog ==========
type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.closeButton}>
            <Text style={{ fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
          {children}
        </View>
      </View>
    </Modal>
  );
};


// ========== DialogHeader ==========
export const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.header}>{children}</View>
);

// ========== DialogFooter ==========
export const DialogFooter = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.footer}>{children}</View>
);

// ========== DialogTitle ==========
export const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.title}>{children}</Text>
);

// ========== DialogDescription ==========
export const DialogDescription = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.description}>{children}</Text>
);

// ========== Styles ==========
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
  },
  header: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
