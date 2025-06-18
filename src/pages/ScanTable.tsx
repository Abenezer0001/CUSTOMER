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
import { cn } from '@/lib/utils';
import QrScanner from 'qr-scanner';

const ScanTable: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrBoxRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<QrScanner>();
  const [qrOn, setQrOn] = useState<boolean>(false);

  // Handle QR scan success
  const onScanSuccess = (result: QrScanner.ScanResult) => {
    console.log('QR Scanner: Raw result detected:', result);
    
    if (result?.data) {
      console.log('Raw QR code data detected:', result.data);
      
      // Extract table ID from the QR code data
      let tableId = result.data;
      
      // Try to extract table ID from URL if the QR code contains a URL
      try {
        const url = new URL(result.data);
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
  };

  // Handle QR scan failure
  const onScanFail = (err: string | Error) => {
    // Don't log every scan failure as it's normal when no QR code is present
    // console.log('QR Scanner: Scan attempt failed:', err);
  };

  // Start camera for QR scanning
  const startCamera = async () => {
    try {
      setError(null);
      console.log('Starting QR scanner...');
      
      if (videoRef.current && !scannerRef.current) {
        // Create QR Scanner instance
        scannerRef.current = new QrScanner(
          videoRef.current,
          onScanSuccess,
          {
            onDecodeError: onScanFail,
            preferredCamera: "environment", // Use back camera on mobile
            highlightScanRegion: true,
            highlightCodeOutline: true,
            overlay: qrBoxRef.current || undefined,
          }
        );

        // Start QR Scanner
        await scannerRef.current.start();
        setQrOn(true);
        setCameraPermission(true);
        console.log('QR scanner started successfully');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraPermission(false);
      setQrOn(false);
      setError('Could not access camera. Please check permissions.');
    }
  };

  // Stop camera and clean up
  const stopCamera = () => {
    console.log('Stopping QR scanner...');
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = undefined;
    }
    setQrOn(false);
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
                  <div 
                    ref={qrBoxRef}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-3/4 h-3/4 border-2 border-white/50 rounded-lg" />
                  </div>
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