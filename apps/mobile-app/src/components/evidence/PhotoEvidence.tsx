import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { capturePhoto, pickFromGallery } from '@/services/evidenceManager';

interface PhotoEvidenceProps {
  photos: string[];
  onAdd: (uri: string) => void;
  onRemove: (uri: string) => void;
  maxPhotos?: number;
}

export function PhotoEvidence({
  photos,
  onAdd,
  onRemove,
  maxPhotos = 5,
}: PhotoEvidenceProps) {
  const handleCamera = async () => {
    const uri = await capturePhoto();
    if (uri) onAdd(uri);
  };

  const handleGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) onAdd(uri);
  };

  const canAdd = photos.length < maxPhotos;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Evidencia fotográfica ({photos.length}/{maxPhotos})
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {photos.map((uri) => (
          <View key={uri} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(uri)}
            >
              <X size={12} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ))}

        {canAdd && (
          <View style={styles.addButtons}>
            <TouchableOpacity style={styles.addBtn} onPress={handleCamera}>
              <Camera size={24} color="#2563eb" />
              <Text style={styles.addText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleGallery}>
              <ImagePlus size={24} color="#2563eb" />
              <Text style={styles.addText}>Galería</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  scroll: { flexDirection: 'row' },
  photoWrapper: { position: 'relative', marginRight: 8 },
  photo: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f1f5f9' },
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtons: { flexDirection: 'row', gap: 8 },
  addBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  addText: { fontSize: 10, color: '#2563eb', fontWeight: '500', marginTop: 4 },
});
