import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Modalize } from 'react-native-modalize';
import { Calendar } from 'react-native-calendars';

export default function DatePickerBottomSheet() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const modalizeRef = useRef<Modalize>(null);

  const openCalendar = () => {
    modalizeRef.current?.open();
  };


  return (
    <View style={{ padding: 16, flex: 1 }}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>Select Date</Text>

      <TouchableOpacity onPress={openCalendar} style={{ backgroundColor: '#eee', padding: 12, borderRadius: 8 }}>
        <Text>{selectedDate ? selectedDate : 'Choose a date'}</Text>
      </TouchableOpacity>

    </View>
  );
}
