import React from "react";
import { View, Text, ScrollView, StyleSheet, ViewProps, TextProps } from "react-native";

const Table: React.FC<ViewProps> = ({ children, style, ...props }) => {
  return (
    <ScrollView horizontal style={[styles.tableWrapper, style]} {...props}>
      <View>{children}</View>
    </ScrollView>
  );
};

const TableHeader: React.FC<ViewProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.tableHeader, style]} {...props}>
      {children}
    </View>
  );
};

const TableBody: React.FC<ViewProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.tableBody, style]} {...props}>
      {children}
    </View>
  );
};

const TableFooter: React.FC<ViewProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.tableFooter, style]} {...props}>
      {children}
    </View>
  );
};

const TableRow: React.FC<ViewProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.tableRow, style]} {...props}>
      {children}
    </View>
  );
};

const TableHead: React.FC<TextProps> = ({ children, style, ...props }) => {
  return (
    <Text style={[styles.tableHead, style]} {...props}>
      {children}
    </Text>
  );
};

const TableCell: React.FC<TextProps> = ({ children, style, ...props }) => {
  return (
    <Text style={[styles.tableCell, style]} {...props}>
      {children}
    </Text>
  );
};

const TableCaption: React.FC<TextProps> = ({ children, style, ...props }) => {
  return (
    <Text style={[styles.tableCaption, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  tableWrapper: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f3f3f3",
  },
  tableBody: {},
  tableFooter: {
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#eee",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  tableHead: {
    flex: 1,
    padding: 12,
    fontWeight: "600",
    color: "#666",
    textAlign: "left",
  },
  tableCell: {
    flex: 1,
    padding: 12,
    color: "#333",
    textAlign: "left",
  },
  tableCaption: {
    marginTop: 8,
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
});

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
