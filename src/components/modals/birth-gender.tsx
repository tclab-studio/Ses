import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

interface BirthDateGenderModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (data: { birthDate: Date; gender: string }) => void;
}

export default function BirthDateGenderModal({
  visible,
  onDismiss,
  onConfirm,
}: BirthDateGenderModalProps) {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const isWeb = Platform.OS === "web";

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["55%", "72%"], []);

  const [gender, setGender] = useState("Male");
  const [year, setYear] = useState("2000");
  const [month, setMonth] = useState("01");
  const [day, setDay] = useState("01");

  useEffect(() => {
    if (!isWeb) {
      if (visible) {
        bottomSheetModalRef.current?.present();
      } else {
        bottomSheetModalRef.current?.dismiss();
      }
    }
  }, [visible, isWeb]);

  const handleConfirm = () => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);

    if (isNaN(y) || isNaN(m) || isNaN(d)) {
      Alert.alert("Invalid Date", "Please enter valid numeric values.");
      return;
    }
    if (m < 1 || m > 12) {
      Alert.alert("Invalid Month", "Month must be between 01 and 12.");
      return;
    }
    const daysInMonth = new Date(y, m, 0).getDate();
    if (d < 1 || d > daysInMonth) {
      Alert.alert("Invalid Day", `Day must be between 01 and ${daysInMonth}.`);
      return;
    }

    const parsedDate = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - parsedDate.getFullYear();
    const monthDiff = today.getMonth() - parsedDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < parsedDate.getDate())
    ) {
      age--;
    }
    if (parsedDate > today) {
      Alert.alert("Invalid Date", "Birth date cannot be in the future.");
      return;
    }
    if (age < 13) {
      Alert.alert("Age Restriction", "You must be at least 13 years old.");
      return;
    }
    if (age > 120) {
      Alert.alert("Invalid Date", "Please enter a valid birth year.");
      return;
    }

    onConfirm({ birthDate: parsedDate, gender });
    if (!isWeb) bottomSheetModalRef.current?.dismiss();
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        onPress={onDismiss}
      />
    ),
    [onDismiss],
  );

  const FormContent = (
    <View style={{ gap: 24 }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "900",
          color: dark ? "#fff" : "#111",
          textAlign: "center",
          letterSpacing: -0.5,
        }}
      >
        Age & Gender
      </Text>

      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: dark ? "#52525b" : "#a1a1aa",
            textTransform: "uppercase",
            letterSpacing: 1.2,
          }}
        >
          Gender
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {["Male", "Female"].map((item) => {
            const isSelected = gender === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setGender(item)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected
                    ? dark
                      ? "#fff"
                      : "#111"
                    : dark
                      ? "#18181b"
                      : "#f5f5f5",
                  borderWidth: 1.5,
                  borderColor: isSelected
                    ? dark
                      ? "#fff"
                      : "#111"
                    : dark
                      ? "#27272a"
                      : "#e5e5e5",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: isSelected
                      ? dark
                        ? "#111"
                        : "#fff"
                      : dark
                        ? "#71717a"
                        : "#737373",
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: dark ? "#52525b" : "#a1a1aa",
            textTransform: "uppercase",
            letterSpacing: 1.2,
          }}
        >
          Birth Date (YYYY / MM / DD)
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            {
              value: year,
              setter: setYear,
              placeholder: "YYYY",
              flex: 2,
              max: 4,
            },
            {
              value: month,
              setter: setMonth,
              placeholder: "MM",
              flex: 1,
              max: 2,
            },
            { value: day, setter: setDay, placeholder: "DD", flex: 1, max: 2 },
          ].map(({ value, setter, placeholder, flex, max }) =>
            isWeb ? (
              <TextInput
                key={placeholder}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={dark ? "#52525b" : "#d4d4d4"}
                keyboardType="number-pad"
                maxLength={max}
                style={
                  {
                    flex,
                    minWidth: 0,
                    backgroundColor: dark ? "#18181b" : "#f5f5f5",
                    borderWidth: 1.5,
                    borderColor: dark ? "#27272a" : "#e5e5e5",
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    fontSize: 15,
                    fontWeight: "700",
                    color: dark ? "#fff" : "#111",
                    textAlign: "center",
                    outlineStyle: "none",
                  } as any
                }
              />
            ) : (
              <BottomSheetTextInput
                key={placeholder}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor="#a1a1aa"
                keyboardType="number-pad"
                maxLength={max}
                style={{
                  flex,
                  minWidth: 0,
                  backgroundColor: dark ? "#18181b" : "#f5f5f5",
                  borderWidth: 1.5,
                  borderColor: dark ? "#27272a" : "#e5e5e5",
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  fontSize: 15,
                  fontWeight: "700",
                  color: dark ? "#fff" : "#111",
                  textAlign: "center",
                }}
              />
            ),
          )}
        </View>
      </View>
    </View>
  );

  const ActionButtons = (
    <View style={{ flexDirection: "row", gap: 12, marginTop: 32 }}>
      <TouchableOpacity
        onPress={onDismiss}
        activeOpacity={0.8}
        style={{
          flex: 1,
          height: 48,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: dark ? "#27272a" : "#e5e5e5",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: dark ? "#71717a" : "#737373",
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleConfirm}
        activeOpacity={0.8}
        style={{
          flex: 1,
          height: 48,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: dark ? "#fff" : "#3B5BDB",
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: dark ? "#111" : "#fff",
          }}
        >
          Save Details
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isWeb) {
    if (!visible) return null;
    return (
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={onDismiss}
      >
        <Pressable
          onPress={onDismiss}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 400,
              backgroundColor: dark ? "#09090b" : "#fff",
              borderRadius: 24,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 24 },
              shadowOpacity: dark ? 0.5 : 0.15,
              shadowRadius: 48,
            }}
          >
            {FormContent}
            {ActionButtons}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
      backgroundStyle={{
        backgroundColor: dark ? "#09090b" : "#ffffff",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
      }}
      handleIndicatorStyle={{
        backgroundColor: dark ? "#27272a" : "#e4e4e7",
        width: 44,
        height: 5,
      }}
    >
      <BottomSheetView style={{ padding: 24, flex: 1, paddingBottom: 32 }}>
        {FormContent}
        {ActionButtons}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
