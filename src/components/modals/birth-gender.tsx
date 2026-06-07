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
  Text,
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

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ["55%", "72% "], []);

  const [gender, setGender] = useState("Male");
  const [year, setYear] = useState("2000");
  const [month, setMonth] = useState("01");
  const [day, setDay] = useState("01");

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

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
    const monthDifference = today.getMonth() - parsedDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < parsedDate.getDate())
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
    bottomSheetModalRef.current?.dismiss();
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
      <BottomSheetView className="p-6 justify-between flex-1 pb-8">
        <View className="gap-6">
          <Text className="text-xl font-black text-neutral-900 dark:text-white text-center tracking-tight">
            Age & Gender
          </Text>

          <View className="gap-2.5">
            <Text className="text-xs font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-widest">
              Gender
            </Text>
            <View className="flex-row gap-3">
              {["Male", "Female"].map((item) => {
                const isSelected = gender === item;
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setGender(item)}
                    activeOpacity={0.8}
                    className={`flex-1 py-3.5 rounded-xl border items-center justify-center ${
                      isSelected
                        ? "bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white"
                        : "bg-neutral-50 border-neutral-200/70 dark:bg-zinc-900 dark:border-zinc-800"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        isSelected
                          ? "text-white dark:text-zinc-950"
                          : "text-neutral-600 dark:text-zinc-400"
                      }`}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="gap-2.5">
            <Text className="text-xs font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-widest">
              Birth Date (YYYY / MM / DD)
            </Text>
            <View className="flex-row gap-3">
              <BottomSheetTextInput
                className="flex-[2] bg-neutral-50 dark:bg-zinc-900 border border-neutral-200/70 dark:border-zinc-800 rounded-xl py-3.5 px-4 text-base font-bold text-neutral-900 dark:text-white text-center"
                value={year}
                onChangeText={setYear}
                placeholder="YYYY"
                placeholderTextColor="#a1a1aa"
                keyboardType="number-pad"
                maxLength={4}
              />
              <BottomSheetTextInput
                className="flex-1 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200/70 dark:border-zinc-800 rounded-xl py-3.5 px-4 text-base font-bold text-neutral-900 dark:text-white text-center"
                value={month}
                onChangeText={setMonth}
                placeholder="MM"
                placeholderTextColor="#a1a1aa"
                keyboardType="number-pad"
                maxLength={2}
              />
              <BottomSheetTextInput
                className="flex-1 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200/70 dark:border-zinc-800 rounded-xl py-3.5 px-4 text-base font-bold text-neutral-900 dark:text-white text-center"
                value={day}
                onChangeText={setDay}
                placeholder="DD"
                placeholderTextColor="#a1a1aa"
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        <View className="flex-row gap-3 mt-6">
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.8}
            className="flex-1 h-12 rounded-xl border border-neutral-200 dark:border-zinc-800 items-center justify-center"
          >
            <Text className="text-sm font-bold text-neutral-500 dark:text-zinc-400">
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleConfirm}
            activeOpacity={0.8}
            className="flex-1 h-12 rounded-xl bg-[#3B5BDB] dark:bg-white items-center justify-center"
          >
            <Text className="text-sm font-bold text-white dark:text-zinc-950">
              Save Details
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
