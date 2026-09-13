import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; active: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', active: 'home' },
  { name: 'workout', title: 'Workout', icon: 'barbell-outline', active: 'barbell' },
  {
    name: 'nutrition',
    title: 'Nutrition',
    icon: 'restaurant-outline',
    active: 'restaurant',
  },
  {
    name: 'progress',
    title: 'Progress',
    icon: 'trending-up-outline',
    active: 'trending-up',
  },
  { name: 'more', title: 'More', icon: 'person-outline', active: 'person' },
];

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.text,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: {
          backgroundColor: theme.color.canvas,
          borderTopColor: theme.color.borderSubtle,
          borderTopWidth: theme.borderWidth.thin,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          fontFamily: theme.fontFamily.sans,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? tab.active : tab.icon}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
