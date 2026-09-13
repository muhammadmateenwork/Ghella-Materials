import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

async function pickFromLibrary(): Promise<ImagePicker.ImagePickerAsset[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Permission needed", "Allow photo library access to add item photos.");
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsMultipleSelection: true,
  });
  return result.canceled ? [] : result.assets;
}

async function takePhoto(): Promise<ImagePicker.ImagePickerAsset[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Permission needed", "Allow camera access to take a photo.");
    return [];
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  return result.canceled ? [] : result.assets;
}

/**
 * On mobile, prompts to choose between camera and library (Alert.alert on
 * web only supports one action, so web goes straight to the library).
 */
export function pickImages(): Promise<ImagePicker.ImagePickerAsset[]> {
  if (Platform.OS === "web") {
    return pickFromLibrary();
  }
  return new Promise((resolve) => {
    Alert.alert("Add photo", undefined, [
      { text: "Take photo", onPress: () => takePhoto().then(resolve) },
      { text: "Choose from library", onPress: () => pickFromLibrary().then(resolve) },
      { text: "Cancel", style: "cancel", onPress: () => resolve([]) },
    ]);
  });
}
