import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "react-native-paper";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface MerchantServicesProps {
  merchantId: string;
}

const MerchantServices: React.FC<MerchantServicesProps> = ({ merchantId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");

  useEffect(() => {
    fetchServices();
  }, [merchantId]);

  useEffect(() => {
    if (editingService) {
      setName(editingService.name);
      setDescription(editingService.description);
      setPrice(editingService.price.toString());
      setDuration(editingService.duration.toString());
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setDuration("30");
    }
  }, [editingService]);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      Alert.alert("Error", "Failed to load services.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async () => {
    if (
      name.length < 2 ||
      description.length < 5 ||
      isNaN(parseFloat(price)) ||
      parseFloat(price) <= 0 ||
      isNaN(parseInt(duration)) ||
      parseInt(duration) <= 0 ||
      parseInt(duration) > 240
    ) {
      Alert.alert("Invalid Input", "Please check your input values.");
      return;
    }

    const serviceData = {
      name,
      description,
      price: parseFloat(price),
      duration: parseInt(duration),
      merchant_id: merchantId,
    };

    try {
      let response;

      if (editingService) {
        response = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);
      } else {
        response = await supabase.from("services").insert([serviceData]);
      }

      if (response.error) throw response.error;

      Alert.alert("Success", editingService ? "Service updated." : "Service added.");
      setModalVisible(false);
      setEditingService(null);
      fetchServices();
    } catch (error) {
      console.error("Error saving service:", error);
      Alert.alert("Error", "Failed to save service.");
    }
  };

  const handleDeleteService = (serviceId: string) => {
    Alert.alert("Delete Service", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("services")
              .delete()
              .eq("id", serviceId);

            if (error) throw error;
            Alert.alert("Deleted", "Service deleted.");
            fetchServices();
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Failed to delete service.");
          }
        },
      },
    ]);
  };

  const openModal = (service: Service | null = null) => {
    setEditingService(service);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Services</Text>
        <Button mode="contained" onPress={() => openModal(null)}>
          Add Service
        </Button>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : services.length === 0 ? (
        <Text style={styles.noServices}>No services yet</Text>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text>{item.description}</Text>
              <Text>Price: ₹{item.price.toFixed(2)}</Text>
              <Text>Duration: {item.duration} minutes</Text>
              <View style={styles.cardButtons}>
                <Button mode="outlined" onPress={() => openModal(item)}>
                  Edit
                </Button>
                <Button mode="text" onPress={() => handleDeleteService(item.id)} color="red">
                  Delete
                </Button>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingService ? "Edit Service" : "Add Service"}</Text>

            <TextInput placeholder="Service Name" value={name} onChangeText={setName} style={styles.input} />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} />
            <TextInput placeholder="Price" keyboardType="numeric" value={price} onChangeText={setPrice} style={styles.input} />
            <TextInput placeholder="Duration (minutes)" keyboardType="numeric" value={duration} onChangeText={setDuration} style={styles.input} />

            <View style={styles.modalButtons}>
              <Button onPress={() => setModalVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={onSubmit}>
                {editingService ? "Update" : "Add"}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MerchantServices;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold" },
  noServices: { textAlign: "center", marginTop: 50, color: "gray" },
  card: { padding: 16, backgroundColor: "#f4f4f4", marginBottom: 12, borderRadius: 8 },
  serviceName: { fontWeight: "bold", fontSize: 16 },
  cardButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: { margin: 20, backgroundColor: "white", borderRadius: 8, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6, marginBottom: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
});
