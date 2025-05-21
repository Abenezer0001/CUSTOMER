import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyTableStatus } from '@/api/menuService';
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, QrCode, AlertTriangle, X, ScanLine } from 'lucide-react';
import jsQR from 'jsqr';
import { cn } from '@/lib/utils';

const ScanTable: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanInterval, setScanInterval] = useState<number | null>(null);

  // Start camera for QR scanning
  const startCamera = async () => {
    try {
      setError(null);
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access');
      }
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile devices
      });
      
      setCameraPermission(true);
      setCameraStream(stream);
      
      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Start scanning for QR codes
      const interval = window.setInterval(() => {
        scanQRCode();
      }, 500) as unknown as number;
      
      setScanInterval(interval);
      
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraPermission(false);
      setError('Could not access camera. Please check permissions.');
    }
  };

  // Stop camera and clean up
  const stopCamera = () => {
    if (scanInterval) {
      clearInterval(scanInterval);
      setScanInterval(null);
    }
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera on component mount
  useEffect(() => {
    startCamera();
  }, []);

  // Scan video frame for QR code
  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.videoWidth === 0) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Get image data for QR code detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Use jsQR to detect QR code
      const code = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        {
          inversionAttempts: "dontInvert",
        }
      );
      
      // If QR code is detected
      if (code) {
        // Extract table ID from the QR code data
        // This assumes the QR code contains a URL like "https://example.com/?table=123"
        // or just the table ID directly
        let tableId = code.data;
        
        // Try to extract table ID from URL if the QR code contains a URL
        try {
          const url = new URL(code.data);
          const params = new URLSearchParams(url.search);
          const urlTableId = params.get('table');
          
          if (urlTableId) {
            tableId = urlTableId;
          }
        } catch (e) {
          // Not a URL, use the raw data as the table ID
        }
        
        if (tableId) {
          handleQRCodeDetected(tableId);
        }
      }
    } catch (err) {
      console.error('QR Code scanning error:', err);
    }
  };

  // Handle detected QR code
  const handleQRCodeDetected = async (tableId: string) => {
    if (!tableId || loading) return;
    
    setLoading(true);
    stopCamera();
    
    try {
      const verification = await verifyTableStatus(tableId);
      
      if (verification.exists && verification.isAvailable) {
        // Store the tableId in the URL and navigate to the menu
        // This ensures the TableContext can pick it up from the URL
        navigate(`/?table=${tableId}`);
      } else {
        setError(verification.exists ? 
          'This table is currently not available.' : 
          'Invalid table ID from QR code.');
        setLoading(false);
        
        // Restart camera if there was an error
        startCamera();
      }
    } catch (err) {
      console.error('Error verifying scanned table:', err);
      setError('Failed to verify the scanned table. Please try again.');
      setLoading(false);
      
      // Restart camera if there was an error
      startCamera();
    }
  };

  return (
    <div className="min-h-screen bg-[#16141F] text-white flex flex-col items-center justify-center">
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 bg-[#1F1D2B] border-b border-[#2D303E] z-10">
        <div className="text-xl font-bold text-white">INSEAT</div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-[#262837]"
          aria-label="Account"
          onClick={() => navigate('/account')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </Button>
      </div>
      
      <Card className="w-full max-w-md bg-[#262837] border-[#2D303E] text-white">
        {/* Welcome header */}
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold mb-2">Welcome to InSeat</h1>
          <p className="text-muted-foreground">Scan your table's QR code to get started</p>
        </div>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg bg-black aspect-square">
              {cameraPermission === false ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gray-900">
                  <AlertTriangle className="h-10 w-10 text-yellow-500 mb-2" />
                  <p className="text-center text-white">
                    Camera access denied. Please enable camera permissions.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => startCamera()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    className="absolute inset-0 h-full w-full object-cover"
                    playsInline 
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-3/4 border-2 border-white/50 rounded-lg" />
                  </div>
                  <canvas 
                    ref={canvasRef} 
                    className="hidden"
                  />
                </>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Position the QR code in the center of the frame
            </p>
            {loading && (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanTable; 