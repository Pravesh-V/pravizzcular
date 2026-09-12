import { useCallback, useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { Card, Screen, SectionLabel, Separator, Text } from '@/components/ui';
import { hasDemoData, resetDemoData } from '@/database/seed';
import { useDatabase, useLiveQuery } from '@/services/database/DatabaseProvider';
import { useSession } from '@/services/session/SessionProvider';
import { useTheme, type ThemePreference } from '@/theme';

export default function MoreScreen() {
  const theme = useTheme();
  const db = useDatabase();
  const { profile, settings, updateSettings } = useSession();
  const [resetting, setResetting] = useState(false);

  const demoPresent = useLiveQuery((database) => hasDemoData(database));

  const handleResetDemo = useCallback(() => {
    const run = async () => {
      setResetting(true);
      try {
        await resetDemoData(db);
      } catch (error) {
        console.error('[settings] demo reset failed', error);
        Alert.alert(
          'That didn’t work',
          'The sample data couldn’t be removed. Try again.',
        );
      } finally {
        setResetting(false);
      }
    };

    Alert.alert(
      'Remove sample data?',
      'This clears the generated demo history. Your exercise library, foods, templates and anything you logged yourself are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void run() },
      ],
    );
  }, [db]);

  return (
    <Screen scroll bottomInset={24}>
      <View style={{ paddingTop: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
        <Text variant="title1">{profile?.displayName || 'Your profile'}</Text>
        <Text variant="footnote" tone="secondary">
          Local account · nothing leaves this device
        </Text>
      </View>

      <SectionLabel label="Units" />
      <Card padded={false}>
        <SegmentedRow
          label="Weight"
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          value={settings?.weightUnit ?? 'kg'}
          onChange={(value) => updateSettings({ weightUnit: value as 'kg' | 'lb' })}
        />
        <Separator inset={theme.spacing.base} />
        <SegmentedRow
          label="Height"
          options={[
            { value: 'cm', label: 'cm' },
            { value: 'ft', label: 'ft / in' },
          ]}
          value={settings?.heightUnit ?? 'cm'}
          onChange={(value) => updateSettings({ heightUnit: value as 'cm' | 'ft' })}
        />
        <Separator inset={theme.spacing.base} />
        <SegmentedRow
          label="Time"
          options={[
            { value: '24h', label: '24h' },
            { value: '12h', label: '12h' },
          ]}
          value={settings?.timeFormat ?? '24h'}
          onChange={(value) => updateSettings({ timeFormat: value as '12h' | '24h' })}
        />
      </Card>

      <View style={{ height: theme.spacing.xl }} />

      <SectionLabel label="Appearance" />
      <Card padded={false}>
        <SegmentedRow
          label="Theme"
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'System' },
          ]}
          value={settings?.theme ?? 'dark'}
          onChange={(value) => updateSettings({ theme: value as ThemePreference })}
        />
      </Card>

      <View style={{ height: theme.spacing.xl }} />

      <SectionLabel label="Privacy" />
      <Card padded={false}>
        <ToggleRow
          label="AI features"
          hint="When off, no data is sent to any AI provider."
          value={settings?.aiEnabled ?? true}
          onChange={(next) => updateSettings({ aiEnabled: next })}
        />
        <Separator inset={theme.spacing.base} />
        <ToggleRow
          label="Haptics"
          hint="Subtle feedback on completed sets and meals."
          value={settings?.hapticsEnabled ?? true}
          onChange={(next) => updateSettings({ hapticsEnabled: next })}
        />
      </Card>

      <View style={{ height: theme.spacing.xl }} />

      <SectionLabel label="Sample data" />
      <Card>
        <Text variant="footnote" tone="secondary">
          {demoPresent
            ? 'This install includes a generated demo history so the app has something to show. It is clearly separated from anything you log yourself.'
            : 'No sample data present. Everything here is yours.'}
        </Text>
        {demoPresent ? (
          <Pressable
            onPress={handleResetDemo}
            disabled={resetting}
            accessibilityRole="button"
            style={{ marginTop: theme.spacing.base }}
          >
            <Text variant="subhead" tone="negative">
              {resetting ? 'Removing…' : 'Remove sample data'}
            </Text>
          </Pressable>
        ) : null}
      </Card>

      <View style={{ height: theme.spacing.xl }} />

      <Text variant="caption" tone="muted">
        Pravesh · Phase 1 build · storage: {db.driverName}
      </Text>
    </Screen>
  );
}

function SegmentedRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.base,
        gap: theme.spacing.md,
      }}
    >
      <Text variant="callout" style={{ flex: 1 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.color.sunken,
          borderRadius: theme.radius.sm,
          padding: 2,
        }}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.xs,
                backgroundColor: active ? theme.color.elevated : 'transparent',
              }}
            >
              <Text variant="footnote" tone={active ? 'primary' : 'muted'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.base,
        gap: theme.spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="callout">{label}</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: theme.color.track, true: theme.color.accent }}
        thumbColor={theme.color.text}
      />
    </View>
  );
}
