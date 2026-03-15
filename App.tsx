import React, { useEffect, useState } from "react";
import { View, Text, Platform, ScrollView } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { SocietyScreen } from "./src/screens/SocietyScreen";
import { EventsScreen } from "./src/screens/EventsScreen";
import { ServicesScreen } from "./src/screens/ServicesScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { BookingScreen } from "./src/screens/BookingScreen";
import { ComplaintsScreen } from "./src/screens/ComplaintsScreen";
import { ContactsScreen } from "./src/screens/ContactsScreen";
import { DirectoryScreen } from "./src/screens/DirectoryScreen";
import { CommitteeScreen } from "./src/screens/CommitteeScreen";
import { NewsScreen } from "./src/screens/NewsScreen";
import { RulesScreen } from "./src/screens/RulesScreen";
import { PollsScreen } from "./src/screens/PollsScreen";
import { AdminScreen } from "./src/screens/AdminScreen";
import { HouseDetailsScreen } from "./src/screens/HouseDetailsScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { getSession, clearSession, setSession } from "./src/utils/storage";
import { palette, radius, typography, spacing } from "./src/theme/tokens";

const isWeb = Platform.OS === "web";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: "grid", unfocused: "grid-outline" },
  Society: { focused: "business", unfocused: "business-outline" },
  Events: { focused: "calendar", unfocused: "calendar-outline" },
  Services: { focused: "compass", unfocused: "compass-outline" },
  Profile: { focused: "person", unfocused: "person-outline" },
};

const Tabs: React.FC<{ user: any; onUpdate: (data: any) => void; onLogout: () => void }> = ({ user, onUpdate, onLogout }) => {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons?.focused : icons?.unfocused;
          return <Ionicons name={iconName ?? "ellipse-outline"} size={22} color={color} />;
        },
        tabBarLabel: ({ focused }) => (
          <Text
            style={{
              ...typography.tiny,
              color: focused ? palette.primary : colors.textMuted,
              marginTop: -2,
            }}
          >
            {route.name}
          </Text>
        ),
        tabBarStyle: {
          position: isWeb ? ("relative" as any) : "absolute",
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: spacing.xs,
          ...(Platform.OS === "ios" || isWeb ? {} : { elevation: 0 }),
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
          ) : (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.tabBar,
              }}
            />
          ),
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: colors.textMuted,
      })}
    >
      <Tab.Screen name="Dashboard">
        {() => <DashboardScreen user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Society" component={SocietyScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Services">
        {() => <ServicesScreen role={user.role} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} onUpdate={onUpdate} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const MainStack: React.FC<{ user: any; onUpdate: (data: any) => void; onLogout: () => void }> = ({ user, onUpdate, onLogout }) => {
  const { colors, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "transparent" },
        headerTintColor: colors.text,
        headerTitleStyle: { ...typography.bodyBold },
        headerShadowVisible: false,
        headerTransparent: true,
        headerBlurEffect: isDark ? "dark" : "light",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" options={{ headerShown: false }}>
        {() => <Tabs user={user} onUpdate={onUpdate} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="Complaints" component={ComplaintsScreen} />
      <Stack.Screen name="Contacts" component={ContactsScreen} />
      <Stack.Screen name="Directory" component={DirectoryScreen} />
      <Stack.Screen name="Committee" component={CommitteeScreen} />
      <Stack.Screen name="News" component={NewsScreen} />
      <Stack.Screen name="Rules" component={RulesScreen} />
      <Stack.Screen name="Polls">
        {() => <PollsScreen currentRole={user.role} />}
      </Stack.Screen>
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="HouseDetails" component={HouseDetailsScreen} options={{ title: "Details" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

const AppRoot = () => {
  const { colors, mode } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      setUser(session);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => undefined);
  }, []);

  const handleLogin = async () => {
    const session = await getSession();
    setUser(session);
  };

  const handleLogout = async () => {
    await clearSession();
    setUser(null);
  };

  const handleUpdate = async (data: any) => {
    const updated = { ...user, ...data };
    setUser(updated);
    await setSession(updated);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={colors.heroGradient as unknown as [string, string, ...string[]]}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ ...typography.h2, color: colors.text }}>Shreenathji Angan</Text>
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}>Loading...</Text>
      </LinearGradient>
    );
  }

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.cardSolid,
          text: colors.text,
          border: colors.border,
          primary: palette.primary,
        },
      }}
    >
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main">
            {() => <MainStack user={user} onUpdate={handleUpdate} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth">
            {() => <AuthScreen onLogin={handleLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
