import { TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  /** Unit shown inside the field, e.g. 'kg', 'cm', 'kcal'. */
  suffix?: string;
  maxLength?: number;
  autoFocus?: boolean;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  suffix,
  maxLength,
  autoFocus = false,
}: FieldProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.color.sunken,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.color.borderSubtle,
          paddingHorizontal: theme.spacing.base,
          minHeight: theme.minTouchTarget + 4,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.color.textMuted}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoFocus={autoFocus}
          accessibilityLabel={label}
          style={{
            flex: 1,
            color: theme.color.text,
            fontSize: theme.type.body.fontSize,
            fontFamily:
              keyboardType === 'default' ? theme.fontFamily.sans : theme.fontFamily.mono,
            paddingVertical: theme.spacing.md,
          }}
        />
        {suffix ? (
          <Text variant="footnote" tone="muted">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
