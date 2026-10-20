import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import CreateGameForm from "@/components/games/CreateGameForm";
import { supabase } from "@/lib/supabase";

export default function OrganizerCreateGameScreen() {
    const router = useRouter();

    const [organizerName, setOrganizerName] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrganizer();
    }, []);

    async function loadOrganizer() {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/");
                return;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user.id)
                .single();

            if (error) {
                console.log("Load organizer error:", error.message);
                return;
            }

            setOrganizerName(data?.full_name?.trim() || "Organizer");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <CreateGameForm
            organizerName={organizerName}
            allowOrganizerEditing={false}
            onBack={() => router.replace("/(organizer)/games")}
            onSuccess={() => router.replace("/(organizer)/games")}
        />
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: "#07131D",
        alignItems: "center",
        justifyContent: "center",
    },
});