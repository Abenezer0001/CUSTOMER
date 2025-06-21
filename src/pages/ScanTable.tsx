import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyTableStatus } from '@/api/menuService';
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Camera, AlertTriangle } from 'lucide-react';
import QRIcon from '@/assets/qr.svg';

const ScanTable: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle manual table ID input (if user types in table ID from QR code)
  const handleManualTableId = async (tableId: string) => {
    if (!tableId || loading) return;
    
    console.log('Manual table ID entered:', tableId);
    setLoading(true);
    setError(null);
    
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
          'Invalid table ID.';
        console.error('Table verification failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Error verifying table:', err);
      setError('Failed to verify the table. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle native camera button click
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection from native camera
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Image captured from native camera:', file.name);
      // Reset the input so the same file can be selected again
      event.target.value = '';
      
      // Show message to user about manually entering table ID
      setError('Please look at your QR code and enter the table ID manually in the input field below, or try scanning again.');
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
        
        <CardContent className="px-6 pb-6">
          {/* QR Code - Clickable to open native camera */}
          <div className="flex justify-center items-center mb-6 h-96 md:h-[30rem]">
            <button
              onClick={handleCameraClick}
              disabled={loading}
              className="relative transition-transform hover:scale-105 disabled:opacity-50 w-full h-full flex items-center justify-center p-0"
            >
              {/* Custom styled QR code to maximize size */}
              <div className="w-full h-full p-4 flex items-center justify-center">
                <div className="relative w-full h-full max-w-[400px] max-h-[400px]">
                  <img 
                    src={QRIcon} 
                    alt="QR Code Scanner" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: 'brightness(1.2) contrast(1.2)',
                      transform: 'scale(3.0)',
                      transformOrigin: 'center center',
                    }}
                  />
                </div>
              </div>
              {loading && (
                <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </button>
          </div>
          
          <p className="text-center text-muted-foreground text-sm mb-4">
            Tap the QR code to open your camera and scan
          </p>

          {/* Hidden file input for camera capture */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {/* Error Display */}
          {error && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Notice</AlertTitle>
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanTable; 