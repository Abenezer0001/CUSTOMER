import React, { useState, useEffect } from 'react';
import { Heart, Users, CreditCard, DollarSign, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { tippingService, TipCalculation, StaffMember, RestaurantTippingSettings } from '@/services/TippingService';

interface TippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  restaurantId: string;
  orderAmount: number;
  onTipSubmitted?: (tipAmount: number) => void;
}

const TippingModal: React.FC<TippingModalProps> = ({
  isOpen,
  onClose,
  orderId,
  restaurantId,
  orderAmount,
  onTipSubmitted
}) => {
  const [loading, setLoading] = useState(false);
  const [tipCalculation, setTipCalculation] = useState<TipCalculation | null>(null);
  const [selectedTipPercentage, setSelectedTipPercentage] = useState<number>(0);
  const [customTipAmount, setCustomTipAmount] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [tipMessage, setTipMessage] = useState<string>('');
  const [tippingSettings, setTippingSettings] = useState<RestaurantTippingSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'app_credit'>('card');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Initialize tipping data
  useEffect(() => {
    if (isOpen) {
      initializeTippingData();
    }
  }, [isOpen, orderId, restaurantId]);

  const initializeTippingData = async () => {
    setLoading(true);
    try {
      const [settings, calculation, staff] = await Promise.all([
        tippingService.getRestaurantTippingSettings(restaurantId),
        tippingService.calculateTipSuggestions(orderId),
        tippingService.getAvailableStaff(restaurantId)
      ]);

      setTippingSettings(settings);
      setTipCalculation(calculation);
      setStaffMembers(staff);

      // Set default tip percentage
      if (calculation.suggestedTips.length > 0) {
        const defaultTip = calculation.suggestedTips.find(tip => tip.isDefault) || calculation.suggestedTips[1];
        setSelectedTipPercentage(defaultTip.percentage);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load tipping information');
    } finally {
      setLoading(false);
    }
  };

  const handleTipPercentageSelect = (percentage: number) => {
    setSelectedTipPercentage(percentage);
    setCustomTipAmount('');
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTipAmount(value);
    const tipAmount = parseFloat(value);
    if (!isNaN(tipAmount) && orderAmount > 0) {
      setSelectedTipPercentage((tipAmount / orderAmount) * 100);
    }
  };

  const getCurrentTipAmount = (): number => {
    if (customTipAmount) {
      const amount = parseFloat(customTipAmount);
      return isNaN(amount) ? 0 : amount;
    }
    return (orderAmount * selectedTipPercentage) / 100;
  };

  const handleSubmitTip = async () => {
    const tipAmount = getCurrentTipAmount();
    
    if (tipAmount <= 0) {
      toast.error('Please select a valid tip amount');
      return;
    }

    // Validate tip amount
    if (tippingSettings) {
      const validation = tippingService.validateTipAmount(orderAmount, tipAmount, tippingSettings);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const tipSubmission = {
        orderId,
        staffId: selectedStaff?._id,
        tipAmount,
        tipPercentage: selectedTipPercentage,
        paymentMethod,
        message: tipMessage.trim() || undefined,
        isAnonymous
      };

      const result = await tippingService.submitTip(tipSubmission);
      
      if (result.success) {
        toast.success(result.message || 'Tip submitted successfully!');
        onTipSubmitted?.(tipAmount);
        onClose();
      } else {
        toast.error('Failed to submit tip. Please try again.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit tip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Loading Tipping Options...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!tippingSettings?.isEnabled) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipping Not Available</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Tipping is not currently enabled for this restaurant.
            </p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Show Your Appreciation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Order Total</span>
                <span className="font-semibold">{formatCurrency(orderAmount)}</span>
              </div>
              {getCurrentTipAmount() > 0 && (
                <>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">Tip ({selectedTipPercentage.toFixed(1)}%)</span>
                    <span className="font-semibold text-green-600">{formatCurrency(getCurrentTipAmount())}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">{formatCurrency(orderAmount + getCurrentTipAmount())}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Suggested Tips */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Tip Amount</h3>
            <div className="grid grid-cols-3 gap-3">
              {tipCalculation?.suggestedTips.map((tip) => (
                <Button
                  key={tip.percentage}
                  variant={selectedTipPercentage === tip.percentage ? "default" : "outline"}
                  onClick={() => handleTipPercentageSelect(tip.percentage)}
                  className="h-16 flex flex-col"
                >
                  <span className="text-lg font-semibold">{tip.percentage}%</span>
                  <span className="text-sm">{formatCurrency(tip.amount)}</span>
                </Button>
              ))}
            </div>

            {/* Custom Tip */}
            {tippingSettings?.allowCustomAmount && (
              <div className="mt-4">
                <Label htmlFor="customTip">Custom Tip Amount</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customTip"
                    type="number"
                    placeholder="0.00"
                    value={customTipAmount}
                    onChange={(e) => handleCustomTipChange(e.target.value)}
                    className="pl-10"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Staff Selection */}
          {tippingSettings?.allowStaffSelection && staffMembers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recognize Your Server (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {staffMembers.map((staff) => (
                  <Card
                    key={staff._id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedStaff?._id === staff._id ? "ring-2 ring-primary" : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedStaff(selectedStaff?._id === staff._id ? null : staff)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={staff.avatar} />
                          <AvatarFallback>{staff.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{staff.name}</p>
                          <p className="text-sm text-muted-foreground">{staff.role}</p>
                          {staff.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs">⭐</span>
                              <span className="text-xs">{staff.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Personal Message */}
          <div>
            <Label htmlFor="tipMessage" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Personal Message (Optional)
            </Label>
            <Textarea
              id="tipMessage"
              placeholder="Thank you for the excellent service!"
              value={tipMessage}
              onChange={(e) => setTipMessage(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4" />
              Payment Method
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={paymentMethod === 'card' ? "default" : "outline"}
                onClick={() => setPaymentMethod('card')}
                className="h-12"
              >
                Card
              </Button>
              <Button
                variant={paymentMethod === 'cash' ? "default" : "outline"}
                onClick={() => setPaymentMethod('cash')}
                className="h-12"
                disabled={!tippingSettings?.allowCashTips}
              >
                Cash
              </Button>
              <Button
                variant={paymentMethod === 'app_credit' ? "default" : "outline"}
                onClick={() => setPaymentMethod('app_credit')}
                className="h-12"
              >
                App Credit
              </Button>
            </div>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-muted-foreground"
            />
            <Label htmlFor="anonymous" className="text-sm">
              Leave tip anonymously
            </Label>
          </div>

          {/* Tipping Message from Restaurant */}
          {tippingSettings?.tippingMessage && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  {tippingSettings.tippingMessage}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button
              onClick={handleSubmitTip}
              disabled={getCurrentTipAmount() <= 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Processing...' : `Tip ${formatCurrency(getCurrentTipAmount())}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TippingModal;
