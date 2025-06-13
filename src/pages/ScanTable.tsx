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
        // Wait for loadedmetadata event before playing to avoid interrupt errors
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error('Error playing video:', err);
          });
        };
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
    
    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Get image data for QR code detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Use jsQR to detect QR code with more aggressive settings
      const code = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        {
          inversionAttempts: "attemptBoth", // Try both normal and inverted
        }
      );
      
      // If QR code is detected
      if (code) {
        console.log('Raw QR code data detected:', code.data);
        
        // Extract table ID from the QR code data
        let tableId = code.data;
        
        // Try to extract table ID from URL if the QR code contains a URL
        try {
          const url = new URL(code.data);
          console.log('QR code contains URL:', url.toString());
          
          // Check for table parameter in different formats
          const params = new URLSearchParams(url.search);
          const urlTableId = params.get('table') || params.get('tableId') || params.get('id');
          
          if (urlTableId) {
            tableId = urlTableId;
            console.log('Extracted table ID from URL:', tableId);
          } else {
            // Try to extract from pathname (e.g., /table/123)
            const pathMatch = url.pathname.match(/\/table\/([^\/]+)/);
            if (pathMatch) {
              tableId = pathMatch[1];
              console.log('Extracted table ID from path:', tableId);
            }
          }
        } catch (e) {
          // Not a URL, use the raw data as the table ID
          console.log('QR code is not a URL, using raw data as table ID:', tableId);
        }
        
        // Validate table ID format (should be alphanumeric)
        if (tableId && /^[a-zA-Z0-9_-]+$/.test(tableId.trim())) {
          console.log('Valid table ID format detected:', tableId.trim());
          handleQRCodeDetected(tableId.trim());
        } else {
          console.warn('Invalid table ID format:', tableId);
        }
      }
    } catch (err) {
      console.error('QR Code scanning error:', err);
    }
  };

  // Handle detected QR code
  const handleQRCodeDetected = async (tableId: string) => {
    if (!tableId || loading) return;
    
    console.log('QR Code detected:', tableId);
    setLoading(true);
    stopCamera();
    
    try {
      console.log('Verifying table status for:', tableId);
      const verification = await verifyTableStatus(tableId);
      console.log('Table verification result:', verification);
      
      if (verification.exists && verification.isAvailable) {
        console.log('Table is valid, navigating to menu with table ID:', tableId);
        // Store the tableId in localStorage for the TableContext
        localStorage.setItem('currentTableId', tableId);
        
        // Navigate to the menu page with table parameter
        navigate(`/menu?table=${tableId}`);
      } else {
        const errorMsg = verification.exists ? 
          'This table is currently not available.' : 
          'Invalid table ID from QR code.';
        console.error('Table verification failed:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        
        // Restart camera after a short delay
        setTimeout(() => {
          startCamera();
        }, 2000);
      }
    } catch (err) {
      console.error('Error verifying scanned table:', err);
      setError('Failed to verify the scanned table. Please try again.');
      setLoading(false);
      
      // Restart camera after a short delay
      setTimeout(() => {
        startCamera();
      }, 2000);
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