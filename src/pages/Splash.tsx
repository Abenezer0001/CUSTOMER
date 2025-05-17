import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyTableStatus } from '@/api/menuService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTableInfo } from '@/context/TableContext';
import { Loader2 } from 'lucide-react';

// Simple progress bar component
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

const Splash: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { setTableInfo } = useTableInfo();

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let redirectTimeout: NodeJS.Timeout;
    
    const handleTableVerification = async () => {
      // Start progress animation
      progressInterval = setInterval(() => {
        setProgress(prev => {
          // Only increase up to 70% during verification
          return prev < 70 ? prev + 5 : prev;
        });
      }, 100);
      
      try {
        if (tableId) {
          // Attempt to verify the table
          const tableData = await verifyTableStatus(tableId);
          
          if (tableData) {
            // Set table info in context
            setTableInfo({
              tableNumber: tableData.table.number,
              restaurantName: tableData.venue.name
            });
            
            // Store table ID in local storage for use elsewhere
            localStorage.setItem('currentTableId', tableData.table._id);
            localStorage.setItem('currentVenueId', tableData.venue._id);
            
            // Complete progress and redirect to menu
            setProgress(100);
            redirectTimeout = setTimeout(() => {
              navigate(`/menu?table=${tableData.table._id}`);
            }, 500);
          } else {
            throw new Error('Invalid table');
          }
        } else {
          // No table ID, redirect to scan
          setProgress(100);
          redirectTimeout = setTimeout(() => {
            navigate('/scan');
          }, 500);
        }
      } catch (err) {
        // Handle error
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to verify table. Please try again.'
        );
        
        // Complete progress and redirect to scan
        setProgress(100);
        redirectTimeout = setTimeout(() => {
          navigate('/scan');
        }, 1500);
      } finally {
        clearInterval(progressInterval);
      }
    };
    
    handleTableVerification();
    
    // Cleanup
    return () => {
      clearInterval(progressInterval);
      clearTimeout(redirectTimeout);
    };
  }, [tableId, navigate, setTableInfo]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">INSEAT</h1>
          <p className="text-muted-foreground">Loading your dining experience</p>
        </div>
        
        <ProgressBar progress={progress} />
        
        {progress < 100 && (
          <div className="flex justify-center pt-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default Splash; 