import React from 'react';
import { Tabs } from 'expo-router';
import { MessageSquareText, Map as MapIcon, BellRing, UserCog } from 'lucide-react-native';
import { useAlertStore } from '../../src/store/alertStore';
import { colors, brand } from '../../src/theme/theme';

export default function TabLayout() {
  const unreadCount = useAlertStore((s) => s.unreadCount);
  const latestCritical = useAlertStore((s) => s.alerts.find((a) => a.severity === 'critical'));

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: brand.name,
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageSquareText size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Marine Map & Routing',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => <MapIcon size={size} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Proactive Watchdog',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <BellRing size={size} color={latestCritical ? colors.alertDanger : color} strokeWidth={2.2} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: latestCritical ? colors.alertDanger : colors.accent,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Role & Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <UserCog size={size} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}