import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Camera, Upload, FileText, Loader2 } from 'lucide-react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { toast } from 'sonner';
import { api } from '../utils/api';

const Scanner = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState('upload');
  const [image, setImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/sign-in');
    }
  }, [user, loading, navigate]);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      processImage(imageSrc);
    }
  };

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageSrc = event.target?.result;
        setImage(imageSrc);
        processImage(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageSrc) => {
    setProcessing(true);
    setExtractedText('');
    setProgress(0);

    try {
      const result = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      setExtractedText(result.data.text);
      toast.success('Text extracted successfully');

      // Parse and extract amount if possible
      const amountMatch = result.data.text.match(/(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i);
      if (amountMatch) {
        toast.info(`Detected amount: ₹${amountMatch[1]}`);
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Failed to extract text');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setExtractedText('');
    setProgress(0);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <AppLayout>
      <Header title="Receipt Scanner" />

      <div className="max-w-4xl mx-auto">
        {!image ? (
          <Card className="glass" data-testid="scanner-mode-card">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-bold mb-2">Scan Your Receipt</h2>
                <p className="text-muted-foreground">
                  Upload a photo or capture a receipt to extract transaction details using OCR
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => setMode('camera')}
                  className="flex-1 sm:flex-none"
                  data-testid="use-camera-button"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Use Camera
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 sm:flex-none glass-strong"
                  data-testid="upload-file-button"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="file-input"
                />
              </div>

              {mode === 'camera' && (
                <div className="mt-8 rounded-2xl overflow-hidden relative">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: facingMode }}
                    className="w-full rounded-2xl"
                    data-testid="webcam-view"
                  />
                  <Button
                    onClick={flipCamera}
                    variant="outline"
                    size="icon"
                    className="absolute top-4 right-4 rounded-full glass-strong"
                    data-testid="flip-camera-button"
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={capture}
                      className="flex-1"
                      size="lg"
                      data-testid="capture-button"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Capture Photo
                    </Button>
                    <Button
                      onClick={() => setMode('upload')}
                      variant="outline"
                      size="lg"
                      className="glass-strong"
                      data-testid="cancel-camera-button"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="glass" data-testid="preview-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Receipt Preview</h3>
                  <Button variant="outline" onClick={reset} data-testid="reset-button">
                    Scan Another
                  </Button>
                </div>
                <img
                  src={image}
                  alt="Scanned receipt"
                  className="w-full rounded-xl mb-4"
                  data-testid="scanned-image"
                />
                {processing && (
                  <div className="text-center" data-testid="processing-indicator">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Processing... {progress}%</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {extractedText && (
              <Card className="glass" data-testid="extracted-text-card">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4">Extracted Text</h3>
                  <div className="p-4 rounded-xl glass-strong">
                    <pre className="whitespace-pre-wrap text-sm font-mono" data-testid="extracted-text">
                      {extractedText}
                    </pre>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Review the extracted text and add it as a transaction if needed.
                  </p>
                  <Button
                    onClick={() => navigate('/transactions')}
                    className="w-full mt-4"
                    data-testid="add-transaction-button"
                  >
                    Add as Transaction
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Scanner;