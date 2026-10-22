import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";

const ORGANIZER_TYPES = [
    "Game Host",
    "Field Owner",
    "Football Group",
    "Academy / Coach",
];

const AREAS = [
    "Bole",
    "Megenagna",
    "Gerji",
    "CMC",
    "Kazanchis",
    "Saris",
    "Jemo",
    "Lafto",
    "Summit",
    "Ayat",
    "Other",
];

const FREQUENCIES = [
    "Several times a week",
    "Once a week",
    "A few times a month",
    "Occasionally",
];

export default function OrganizerApplicationScreen() {
    const [organizerName, setOrganizerName] = useState("");
    const [phone, setPhone] = useState("");
    const [organizerType, setOrganizerType] = useState("");

    const [area, setArea] = useState("");
    const [customArea, setCustomArea] = useState("");

    const [frequency, setFrequency] = useState("");
    const [contact, setContact] = useState("");

    const [typeOpen, setTypeOpen] = useState(false);
    const [areaOpen, setAreaOpen] = useState(false);
    const [frequencyOpen, setFrequencyOpen] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        const finalArea = area === "Other" ? customArea.trim() : area;

        if (
            !organizerName.trim() ||
            !phone.trim() ||
            !organizerType ||
            !finalArea ||
            !frequency
        ) {
            Alert.alert(
                "Missing information",
                "Please complete all required fields.",
            );
            return;
        }

        try {
            setSubmitting(true);

            const { error } = await supabase.rpc(
                "submit_organizer_application",
                {
                    p_organizer_name: organizerName.trim(),
                    p_area: finalArea,
                    p_organizer_type: organizerType,
                    p_phone: phone.trim(),
                    p_contact_method: contact.trim() || null,
                    p_games_frequency: frequency,
                },
            );

            if (error) {
                console.log("Organizer application error:", error);

                Alert.alert("Couldn't submit application", error.message);

                return;
            }

            router.replace("/organizer-application-success");
        } catch (error) {
            console.log("Organizer application error:", error);

            Alert.alert("Something went wrong", "Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* HEADER */}
            <View style={styles.header}>
                <Link href="/become-organizer" asChild>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                        hitSlop={12}
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
                    </Pressable>
                </Link>

                <Text style={styles.headerTitle}>Organizer Application</Text>

                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* PROGRESS */}
                <View style={styles.progressRow}>
                    <View style={styles.progressActive} />
                    <View style={styles.progressInactive} />
                </View>

                <Text style={styles.title}>Tell us about yourself</Text>

                <Text style={styles.description}>
                    This should only take about a minute.
                </Text>

                {/* YOUR INFORMATION */}
                <Text style={styles.sectionTitle}>Your information</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Organizer name *</Text>

                    <TextInput
                        value={organizerName}
                        onChangeText={setOrganizerName}
                        placeholder="Your name or group name"
                        placeholderTextColor="#617784"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Phone number *</Text>

                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="09..."
                        placeholderTextColor="#617784"
                        keyboardType="phone-pad"
                        style={styles.inputLast}
                    />
                </View>

                {/* ABOUT YOUR GAMES */}
                <Text style={styles.sectionTitle}>About your games</Text>

                <View style={styles.card}>
                    <SelectField
                        label="What best describes you? *"
                        value={organizerType}
                        placeholder="Select organizer type"
                        open={typeOpen}
                        onToggle={() => {
                            setTypeOpen((current) => !current);
                            setAreaOpen(false);
                            setFrequencyOpen(false);
                        }}
                        options={ORGANIZER_TYPES}
                        onSelect={(value) => {
                            setOrganizerType(value);
                            setTypeOpen(false);
                        }}
                    />

                    <View style={styles.fieldGap} />

                    <SelectField
                        label="Main area *"
                        value={area}
                        placeholder="Select area"
                        open={areaOpen}
                        scrollable
                        onToggle={() => {
                            setAreaOpen((current) => !current);
                            setTypeOpen(false);
                            setFrequencyOpen(false);
                        }}
                        options={AREAS}
                        onSelect={(value) => {
                            setArea(value);
                            setAreaOpen(false);

                            if (value !== "Other") {
                                setCustomArea("");
                            }
                        }}
                    />

                    {area === "Other" && (
                        <View style={styles.customAreaContainer}>
                            <Text style={styles.label}>
                                Enter city or area *
                            </Text>

                            <TextInput
                                value={customArea}
                                onChangeText={setCustomArea}
                                placeholder="e.g. Adama, Bishoftu..."
                                placeholderTextColor="#617784"
                                autoCapitalize="words"
                                style={styles.inputLast}
                            />
                        </View>
                    )}

                    <View style={styles.fieldGap} />

                    <SelectField
                        label="How often do you organize? *"
                        value={frequency}
                        placeholder="Select frequency"
                        open={frequencyOpen}
                        onToggle={() => {
                            setFrequencyOpen((current) => !current);
                            setTypeOpen(false);
                            setAreaOpen(false);
                        }}
                        options={FREQUENCIES}
                        onSelect={(value) => {
                            setFrequency(value);
                            setFrequencyOpen(false);
                        }}
                    />
                </View>

                {/* CONTACT */}
                <Text style={styles.sectionTitle}>Contact</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Telegram / WhatsApp</Text>

                    <TextInput
                        value={contact}
                        onChangeText={setContact}
                        placeholder="Optional"
                        placeholderTextColor="#617784"
                        style={styles.inputLast}
                    />

                    <Text style={styles.helperText}>
                        Add another way players can reach you.
                    </Text>
                </View>

                {/* FREE */}
                <View style={styles.freeBox}>
                    <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color="#49D39A"
                    />

                    <View style={styles.freeText}>
                        <Text style={styles.freeTitle}>Free to organize</Text>

                        <Text style={styles.freeSubtitle}>
                            No subscription or per-game fee.
                        </Text>
                    </View>
                </View>

                {/* SUBMIT */}
                <Pressable
                    disabled={submitting}
                    onPress={handleSubmit}
                    style={({ pressed }) => [
                        styles.submitButton,
                        pressed && !submitting && styles.pressed,
                        submitting && styles.submitButtonDisabled,
                    ]}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Text style={styles.submitButtonText}>
                                Submit Application
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={20}
                                color="#FFFFFF"
                            />
                        </>
                    )}
                </Pressable>

                <Text style={styles.footer}>
                    You'll get organizer access after submitting.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

type SelectFieldProps = {
    label: string;
    value: string;
    placeholder: string;
    open: boolean;
    options: string[];
    scrollable?: boolean;
    onToggle: () => void;
    onSelect: (value: string) => void;
};

function SelectField({
    label,
    value,
    placeholder,
    open,
    options,
    scrollable = false,
    onToggle,
    onSelect,
}: SelectFieldProps) {
    const optionsContent = options.map((option, index) => {
        const selected = option === value;

        return (
            <Pressable
                key={option}
                onPress={() => onSelect(option)}
                style={({ pressed }) => [
                    styles.option,
                    index !== options.length - 1 && styles.optionDivider,
                    pressed && styles.pressed,
                ]}
            >
                <Text
                    style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                    ]}
                >
                    {option}
                </Text>

                {selected && (
                    <Ionicons
                        name="checkmark"
                        size={19}
                        color={COLORS.primary}
                    />
                )}
            </Pressable>
        );
    });

    return (
        <View>
            <Text style={styles.label}>{label}</Text>

            <Pressable
                onPress={onToggle}
                style={({ pressed }) => [
                    styles.select,
                    open && styles.selectOpen,
                    pressed && styles.pressed,
                ]}
            >
                <Text
                    style={[
                        styles.selectText,
                        !value && styles.placeholderText,
                    ]}
                >
                    {value || placeholder}
                </Text>

                <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={19}
                    color="#8195A2"
                />
            </Pressable>

            {open && (
                <View style={styles.options}>
                    {scrollable ? (
                        <ScrollView
                            style={styles.optionsScroll}
                            nestedScrollEnabled
                            showsVerticalScrollIndicator
                            keyboardShouldPersistTaps="handled"
                        >
                            {optionsContent}
                        </ScrollView>
                    ) : (
                        optionsContent
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#07131D",
    },

    header: {
        height: 58,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#183844",
        zIndex: 10,
    },

    backButton: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
    },

    headerTitle: {
        flex: 1,
        color: "#FFFFFF",
        fontSize: 19,
        fontWeight: "800",
        textAlign: "center",
    },

    headerSpacer: {
        width: 48,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        width: "100%",
        maxWidth: 680,
        alignSelf: "center",
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 40,
    },

    progressRow: {
        flexDirection: "row",
        gap: 7,
        marginBottom: 24,
    },

    progressActive: {
        flex: 1,
        height: 4,
        borderRadius: 999,
        backgroundColor: COLORS.primary,
    },

    progressInactive: {
        flex: 1,
        height: 4,
        borderRadius: 999,
        backgroundColor: "#173442",
    },

    title: {
        color: "#FFFFFF",
        fontSize: 25,
        fontWeight: "900",
    },

    description: {
        color: "#8FA1AF",
        fontSize: 13,
        fontWeight: "600",
        marginTop: 6,
        marginBottom: 24,
    },

    sectionTitle: {
        color: "#8FA1AF",
        fontSize: 12,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginLeft: 4,
        marginBottom: 9,
        marginTop: 8,
    },

    card: {
        borderRadius: 18,
        backgroundColor: "#0C1F2B",
        borderWidth: 1,
        borderColor: "#173442",
        padding: 15,
        marginBottom: 18,
    },

    label: {
        color: "#DCE6EB",
        fontSize: 13,
        fontWeight: "800",
        marginBottom: 8,
    },

    input: {
        height: 50,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: "#203B49",
        backgroundColor: "#081923",
        paddingHorizontal: 14,
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 16,
        outlineStyle: "none",
    } as any,

    inputLast: {
        height: 50,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: "#203B49",
        backgroundColor: "#081923",
        paddingHorizontal: 14,
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
        outlineStyle: "none",
    } as any,

    select: {
        minHeight: 50,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: "#203B49",
        backgroundColor: "#081923",
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    selectOpen: {
        borderColor: COLORS.primary,
    },

    selectText: {
        flex: 1,
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },

    placeholderText: {
        color: "#617784",
    },

    options: {
        marginTop: 7,
        borderRadius: 13,
        overflow: "hidden",
        backgroundColor: "#081923",
        borderWidth: 1,
        borderColor: "#203B49",
    },

    optionsScroll: {
        maxHeight: 240,
    },

    option: {
        minHeight: 48,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    optionDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#1D3948",
    },

    optionText: {
        color: "#C7D3DA",
        fontSize: 13,
        fontWeight: "700",
    },

    optionTextSelected: {
        color: "#FFFFFF",
    },

    fieldGap: {
        height: 16,
    },

    customAreaContainer: {
        marginTop: 14,
    },

    helperText: {
        color: "#708594",
        fontSize: 11,
        fontWeight: "600",
        marginTop: 8,
    },

    freeBox: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(73, 211, 154, 0.25)",
        backgroundColor: "rgba(73, 211, 154, 0.07)",
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
    },

    freeText: {
        flex: 1,
    },

    freeTitle: {
        color: "#DFFFF1",
        fontSize: 14,
        fontWeight: "800",
    },

    freeSubtitle: {
        color: "#85AE9C",
        fontSize: 12,
        fontWeight: "600",
        marginTop: 2,
    },

    submitButton: {
        height: 54,
        borderRadius: 15,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
    },

    submitButtonDisabled: {
        opacity: 0.6,
    },

    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "900",
    },

    footer: {
        color: "#657B89",
        fontSize: 11,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 11,
    },

    pressed: {
        opacity: 0.7,
    },
});
