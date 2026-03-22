import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';

export default function ScannerScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [extractedData, setExtractedData] = useState({
    amount: '',
    category: 'Shopping',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const cameraRef = useRef(null);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        });
        setCapturedImage(photo.uri);
        // Simulate OCR processing
        simulateOCRProcessing();
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image');
        console.error('Capture error:', error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const simulateOCRProcessing = () => {
    // In production, this would call an OCR API
    // For now, we'll show a modal where user can manually enter data
    setTimeout(() => {
      setShowResultModal(true);
    }, 1000);
  };

  const handleSaveTransaction = async () => {
    try {
      const transactionData = {
        type: 'expense',
        amount: parseFloat(extractedData.amount) || 0,
        category: extractedData.category,
        description: extractedData.description,
        date: extractedData.date,
        receipt_url: capturedImage
      };

      await api.createTransaction(transactionData);
      Alert.alert('Success', 'Transaction saved successfully!');
      resetScanner();
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
      console.error('Save error:', error);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setShowResultModal(false);
    setExtractedData({
      amount: '',
      category: 'Shopping',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.permissionText, { color: colors.text }]}>
          Camera permission required
        </Text>
        <Text style={[styles.permissionSubtext, { color: colors.textSecondary }]}>
          We need camera access to scan receipts
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage && !showResultModal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.processingText, { color: colors.text }]}>
            Processing receipt...
          </Text>
        </View>
      </View>
    );
  }

  const categories = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Others'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <View style={styles.overlay}>
          <View style={[styles.scanFrame, { borderColor: colors.primary }]}>
            <View style={[styles.cornerTL, { borderColor: colors.primary }]} />
            <View style={[styles.cornerTR, { borderColor: colors.primary }]} />
            <View style={[styles.cornerBL, { borderColor: colors.primary }]} />
            <View style={[styles.cornerBR, { borderColor: colors.primary }]} />
          </View>
          <Text style={styles.instructionText}>
            Align receipt within the frame
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.card }]}
            onPress={toggleCameraFacing}
          >
            <Ionicons name="camera-reverse" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, { backgroundColor: colors.primary }]}
            onPress={capturePhoto}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="scan" size={32} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.card }]}
            onPress={() => Alert.alert('Info', 'Point camera at a receipt to scan and extract transaction details')}
          >
            <Ionicons name="help-circle" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        transparent={true}
        onRequestClose={resetScanner}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add Transaction
              </Text>
              <TouchableOpacity onPress={resetScanner}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {capturedImage && (
                <Image source={{ uri: capturedImage }} style={styles.thumbnailImage} />
              )}

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={extractedData.amount}
                onChangeText={(text) => setExtractedData({ ...extractedData, amount: text })}
                placeholder="Enter amount"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: extractedData.category === cat ? colors.primary : colors.background,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => setExtractedData({ ...extractedData, category: cat })}
                  >
                    <Text style={{
                      color: extractedData.category === cat ? '#fff' : colors.text,
                      fontSize: 12
                    }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={extractedData.description}
                onChangeText={(text) => setExtractedData({ ...extractedData, description: text })}
                placeholder="Enter description"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={extractedData.date}
                onChangeText={(text) => setExtractedData({ ...extractedData, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={resetScanner}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveTransaction}
              >
                <Text style={styles.saveButtonText}>Save Transaction</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanFrame: {
    width: 280,
    height: 380,
    borderWidth: 2,
    position: 'relative',
    borderRadius: 8,
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderRadius: 4,
  },
  instructionText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  thumbnailImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
