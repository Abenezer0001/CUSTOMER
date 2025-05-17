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
import { Input } from '@/components/ui/input';
import { Loader2, QrCode, AlertTriangle, X, ScanLine } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsQR from 'jsqr';
import { cn } from '@/lib/utils';

const ScanTable: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualTableId, setManualTableId] = useState('');
  const [activeTab, setActiveTab] = useState('scan');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanInterval, setScanInterval] = useState<number | null>(null);

  // Handle manual table ID submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTableId.trim() || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const verification = await verifyTableStatus(manualTableId);
      
      if (verification.exists && verification.isAvailable) {
        navigate(`/?table=${manualTableId}`);
      } else {
        setError(verification.exists ? 
          'This table is currently not available.' : 
          'Invalid table ID.');
      }
    } catch (err) {
      console.error('Error verifying table:', err);
      setError('Failed to verify table. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      setError('Could not access camera. Please check permissions or use manual entry.');
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

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Start camera on component mount if on scan tab
  useEffect(() => {
    if (activeTab === 'scan') {
      startCamera();
    }
  }, [activeTab]);

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
      setError('Failed to verify the scanned table. Please try again or use manual entry.');
      setLoading(false);
      
      // Restart camera if there was an error
      startCamera();
    }
  };

return (
  <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
    {/* Scan button at the top */}
    <div className="fixed top-4 left-0 right-0 flex justify-center z-10">
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "rounded-full bg-purple-600 hover:bg-purple-700 border-purple-300",
          activeTab === 'scan' && "bg-purple-700 border-purple-400"
        )}
        onClick={() => handleTabChange('scan')}
        aria-label="Scan QR Code"
      >
        <ScanLine className="h-5 w-5 text-white" />
      </Button>
    </div>
    
    <Card className="w-full max-w-md">
      {/* Welcome header */}
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold mb-2">Welcome to InSeat</h1>
        <p className="text-muted-foreground">Scan your table's QR code or enter the table name to get started</p>
      </div>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="scan" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="scan">Scan QR Code</TabsTrigger>
            <TabsTrigger value="manual">Enter Manually</TabsTrigger>
          </TabsList>
            
            <TabsContent value="scan" className="space-y-4">
              <div className="relative overflow-hidden rounded-lg bg-black aspect-square">
                {cameraPermission === false ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gray-900">
                    <AlertTriangle className="h-10 w-10 text-yellow-500 mb-2" />
                    <p className="text-center text-white">
                      Camera access denied. Please enable camera permissions or enter the table ID manually.
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
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="manual">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter table name"
                  value={manualTableId}
                  onChange={(e) => setManualTableId(e.target.value)}
                  disabled={loading}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!manualTableId.trim() || loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  View Menu
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanTable; 