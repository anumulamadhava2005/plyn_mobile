import React, { createContext, useContext } from 'react';
import { View, Text, Pressable, ViewStyle, StyleProp } from 'react-native';

// Create context to manage tab state
type TabsContextType = {
  selected: string;
  onSelect: (value: string) => void;
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
};

const Tabs = ({ value, onValueChange, children }: TabsProps) => {
  return (
    <TabsContext.Provider value={{ selected: value, onSelect: onValueChange }}>
      {children}
    </TabsContext.Provider>
  );
};

type TabsListProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const TabsList = ({ children, style }: TabsListProps) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6', // neutral-100
          padding: 4,
          borderRadius: 8,
          marginVertical: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

type TabsTriggerProps = {
  value: string;
  label?: string;
  children?: React.ReactNode;
};

const TabsTrigger = ({ value, label, children }: TabsTriggerProps) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { selected, onSelect } = context;
  const isActive = selected === value;

  return (
    <Pressable
      onPress={() => onSelect(value)}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 6,
        backgroundColor: isActive ? '#fff' : 'transparent',
        opacity: isActive ? 1 : 0.7,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: isActive ? '#000' : '#6b7280',
        }}
      >
        {children ?? label ?? capitalize(value)}
      </Text>
    </Pressable>
  );
};

type TabContentProps = {
  value: string;
  children: React.ReactNode;
};

const TabsContent = ({ value, children }: TabContentProps) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (value !== context.selected) return null;

  return <View style={{ marginTop: 12 }}>{children}</View>;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export { Tabs, TabsList, TabsTrigger, TabsContent };
