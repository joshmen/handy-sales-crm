import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, LogOut } from 'lucide-react-native';
import { useAuthStore } from '@/stores';
import { exitTenant } from '@/services/impersonation';

/**
 * Banner ámbar que se muestra mientras el super admin está viendo un tenant en
 * modo soporte (READ_ONLY). "Salir" restaura su contexto y vuelve al picker.
 * No renderiza nada si no hay impersonation activa (los admin normales no lo ven).
 */
export function ImpersonationBanner() {
  const insets = useSafeAreaInsets();
  const impersonation = useAuthStore(s => s.impersonation);
  const [exiting, setExiting] = useState(false);

  if (!impersonation) return null;

  const onExit = async () => {
    setExiting(true);
    try {
      await exitTenant();
      // El routing vuelve al EmpresasPicker al quedar impersonation en null.
    } catch {
      setExiting(false);
    }
  };

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <Eye size={15} color="#92400e" />
      <Text style={styles.text} numberOfLines={1}>
        Viendo: {impersonation.tenantName} · solo lectura
      </Text>
      <TouchableOpacity style={styles.exitBtn} onPress={onExit} disabled={exiting} accessibilityRole="button" accessibilityLabel="Salir del modo soporte">
        {exiting ? <ActivityIndicator size="small" color="#92400e" /> : (
          <>
            <LogOut size={13} color="#92400e" />
            <Text style={styles.exitText}>Salir</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fde68a',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: { flex: 1, fontSize: 13, fontWeight: '700', color: '#92400e' },
  exitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(146,64,14,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, minWidth: 56, justifyContent: 'center' },
  exitText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
});
