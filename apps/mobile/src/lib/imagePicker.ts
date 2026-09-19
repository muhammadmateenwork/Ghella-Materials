import * as ImagePicker from "expo-image-picker";

export async function pickFromLibrary(): Promise<ImagePicker.ImagePickerAsset[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Allow photo library access in your device settings to add item photos.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsMultipleSelection: true,
  });
  return result.canceled ? [] : result.assets;
}

export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Allow camera access in your device settings to take a photo.");
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  return result.canceled ? [] : result.assets;
}
