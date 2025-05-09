import React, { useState } from 'react';
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
import { Loader2, QrCode, AlertTriangle } from 'lucide-react';

const ScanTable: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualTableId, setManualTableId] = useState('');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTableId.trim() || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const verification = await verifyTableStatus(manualTableId);
      
      if (verification.exists && verification.isAvailable) {
        navigate(`/${manualTableId}`);
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

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to INSEAT</CardTitle>
          <CardDescription>
            Enter your table ID to view the menu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <QrCode className="h-16 w-16 text-gray-400 mb-2" />
              <p className="text-center text-gray-500">
                QR scanning is currently disabled.<br />Please enter your table ID manually.
              </p>
            </div>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter table ID"
                value={manualTableId}
                onChange={(e) => setManualTableId(e.target.value)}
                disabled={loading}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={!manualTableId.trim() || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                View Menu
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanTable; 