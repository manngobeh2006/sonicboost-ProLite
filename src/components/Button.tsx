import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  fullWidth = true,
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-800 border border-gray-700';
      case 'danger':
        return 'bg-red-500/10 border border-red-500/30';
      default:
        return 'bg-purple-600';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'danger':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        ${getVariantStyles()}
        ${fullWidth ? 'w-full' : 'self-start'}
        py-4 px-6 rounded-2xl
        flex-row items-center justify-center
        active:opacity-70
        ${disabled || loading ? 'opacity-50' : ''}
      `}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          {icon && (
            <Ionicons 
              name={icon} 
              size={20} 
              color={variant === 'danger' ? '#F87171' : 'white'}
              style={{ marginRight: 8 }}
            />
          )}
          <Text className={`${getTextColor()} text-base font-semibold`}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
