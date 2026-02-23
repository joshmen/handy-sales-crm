import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { Button } from '@/components/ui';

interface SignatureCaptureProps {
  onSave: (uri: string) => void;
  onCancel: () => void;
}

export function SignatureCapture({ onSave, onCancel }: SignatureCaptureProps) {
  const signatureRef = useRef<any>(null);

  const handleSave = async (signature: string) => {
    // signature is a base64 data URI
    const base64Data = signature.replace('data:image/png;base64,', '');
    const filename = `signature_${Date.now()}.png`;
    const filePath = `${documentDirectory}evidence/${filename}`;

    // Ensure directory exists
    const dirInfo = await getInfoAsync(`${documentDirectory}evidence/`);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(`${documentDirectory}evidence/`, {
        intermediates: true,
      });
    }

    await writeAsStringAsync(filePath, base64Data, {
      encoding: EncodingType.Base64,
    });

    onSave(filePath);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firma del cliente</Text>
      <Text style={styles.subtitle}>Firme en el área de abajo</Text>

      <View style={styles.canvasContainer}>
        <SignatureCanvas
          ref={signatureRef}
          onOK={handleSave}
          webStyle={`.m-signature-pad--footer { display: none; } .m-signature-pad { box-shadow: none; border: none; } body,html { width: 100%; height: 100%; }`}
          backgroundColor="#ffffff"
          penColor="#1e293b"
          style={styles.canvas}
        />
      </View>

      <View style={styles.actions}>
        <Button
          title="Limpiar"
          onPress={handleClear}
          variant="outline"
          size="sm"
        />
        <Button
          title="Cancelar"
          onPress={onCancel}
          variant="ghost"
          size="sm"
        />
        <Button
          title="Guardar firma"
          onPress={() => signatureRef.current?.readSignature()}
          size="sm"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  canvasContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  canvas: { flex: 1 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});
