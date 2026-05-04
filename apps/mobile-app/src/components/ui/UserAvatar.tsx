import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS } from '@/theme/colors';

export type UserAvatarProps = {
  /** Nombre completo del usuario — usado para iniciales fallback. */
  name?: string | null;
  /** URL absoluta de la foto. Si null/undefined o falla la carga, render iniciales. */
  avatarUrl?: string | null;
  /** Diámetro en px del círculo. Default 40. */
  size?: number;
  /** Cantidad de notificaciones no leídas. Si > 0, render badge rojo en esquina sup-derecha. */
  unreadCount?: number;
  /** Si presente, wrap en TouchableOpacity con accessibilityRole=button. */
  onPress?: () => void;
  /** Color de borde del badge para ring de contraste. Default blanco. */
  badgeRingColor?: string;
  /** Color de fondo del avatar cuando muestra iniciales. Default header bg. */
  fallbackBgColor?: string;
  /** Color del texto de iniciales. Default headerText. */
  fallbackTextColor?: string;
  /** Estilo extra para el contenedor (margin, alignSelf, etc.). */
  style?: ViewStyle;
  /** Versión cache-buster — agregada como query param a `avatarUrl`. Útil cuando
   *  Cloudinary reusa la misma URL al sustituir foto y el cache de RN devuelve
   *  bytes viejos. Pasar `Usuario.actualizadoEn` o `Date.now()` (menos preciso). */
  cacheKey?: string | number;
  /** testID para Maestro/E2E. */
  testID?: string;
};

function computeInitials(name?: string | null): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar reutilizable con foto + fallback a iniciales + badge opcional de
 * notificaciones. Espejo del patrón Avatar+badge usado en el header web.
 *
 * Uso:
 * ```tsx
 * <UserAvatar
 *   name={user.name}
 *   avatarUrl={user.avatarUrl}
 *   size={40}
 *   unreadCount={unread}
 *   onPress={() => router.push('/(tabs)/profile')}
 * />
 * ```
 *
 * Accesibilidad:
 * - Si `onPress` está presente, usa role=button con label "Mi perfil, N sin leer".
 * - Tap target mínimo asegurado vía `hitSlop` cuando `size < 44`.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  unreadCount = 0,
  onPress,
  badgeRingColor = '#ffffff',
  fallbackBgColor = COLORS.headerBg,
  fallbackTextColor = COLORS.headerText,
  style,
  cacheKey,
  testID,
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = computeInitials(name);
  const showImage = !!avatarUrl && !imageFailed;

  // Cache-bust si nos dan una key
  const finalUri = avatarUrl
    ? cacheKey != null
      ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${cacheKey}`
      : avatarUrl
    : undefined;

  const fontSize = Math.max(10, Math.round(size * 0.4));
  const badgeSize = Math.max(16, Math.round(size * 0.45));
  const badgeFontSize = Math.max(9, Math.round(badgeSize * 0.55));

  const content = (
    <View
      style={[
        styles.container,
        { width: size, height: size, overflow: 'visible' },
        style,
      ]}
      testID={testID}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: showImage ? 'transparent' : fallbackBgColor,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {showImage ? (
          <Image
            source={{ uri: finalUri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text
            style={{
              fontSize,
              fontWeight: '700',
              color: fallbackTextColor,
            }}
          >
            {initials}
          </Text>
        )}
      </View>

      {unreadCount > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: '#dc2626',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            borderWidth: 2,
            borderColor: badgeRingColor,
          }}
          accessibilityElementsHidden={false}
          accessibilityLabel={`${unreadCount} sin leer`}
        >
          <Text style={{ color: '#ffffff', fontSize: badgeFontSize, fontWeight: '700' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );

  if (!onPress) return content;

  // hitSlop: el avatar suele ser ø40 (debajo del 44dp WCAG). Expandimos el
  // área tappable sin afectar el render visual. +2dp extra de comfort
  // padding sobre el mínimo WCAG para evitar fat-finger errors en displays
  // de alta densidad.
  const slop = size < 44 ? Math.ceil((44 - size) / 2) + 2 : 0;
  const a11yLabel = unreadCount > 0
    ? `Mi perfil, ${unreadCount} notificaciones sin leer`
    : 'Mi perfil';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      hitSlop={slop > 0 ? { top: slop, bottom: slop, left: slop, right: slop } : undefined}
      testID={testID}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // Android clips absolutely-positioned children por default. Necesario
    // para que el badge (top:-4 right:-4) no se corte en Android.
    overflow: 'visible',
  },
});
