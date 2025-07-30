import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, User, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentStructure = 'pay_all' | 'equal_split' | 'pay_own' | 'custom_split';

interface PaymentStructureSelectorProps {
  totalAmount: number;
  participantCount: number;
  isGroupLeader: boolean;
  currentParticipantId: string;
  participants: Array<{
    _id: string;
    userName: string;
    totalAmount: number;
  }>;
  onPaymentStructureSelect: (structure: PaymentStructure, customSplits?: Record<string, number>) => void;
}

export const PaymentStructureSelector: React.FC<PaymentStructureSelectorProps> = ({
  totalAmount,
  participantCount,
  isGroupLeader,
  currentParticipantId,
  participants,
  onPaymentStructureSelect,
}) => {
  const [selectedStructure, setSelectedStructure] = useState<PaymentStructure>('pay_own');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});

  const handleStructureChange = (value: PaymentStructure) => {
    setSelectedStructure(value);
    
    // Initialize custom splits if needed
    if (value === 'custom_split') {
      const initialSplits: Record<string, number> = {};
      participants.forEach(p => {
        initialSplits[p._id] = p.totalAmount;
      });
      setCustomSplits(initialSplits);
    }
  };

  const handleCustomSplitChange = (participantId: string, amount: number) => {
    setCustomSplits(prev => ({
      ...prev,
      [participantId]: amount
    }));
  };

  const handleConfirm = () => {
    onPaymentStructureSelect(selectedStructure, selectedStructure === 'custom_split' ? customSplits : undefined);
  };

  const equalSplitAmount = totalAmount / participantCount;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payment Structure
        </CardTitle>
        <CardDescription>
          Choose how the group order will be paid
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedStructure} onValueChange={(value) => handleStructureChange(value as PaymentStructure)}>
          {/* Pay for own orders */}
          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="pay_own" id="pay_own" />
            <Label htmlFor="pay_own" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <User className="h-4 w-4" />
                Pay for Own Orders
              </div>
              <p className="text-sm text-muted-foreground">
                Each person pays for their own items
              </p>
            </Label>
          </div>

          {/* Equal split */}
          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="equal_split" id="equal_split" />
            <Label htmlFor="equal_split" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4" />
                Split Equally
              </div>
              <p className="text-sm text-muted-foreground">
                Total split equally among all participants (${equalSplitAmount.toFixed(2)} each)
              </p>
            </Label>
          </div>

          {/* One person pays all */}
          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="pay_all" id="pay_all" />
            <Label htmlFor="pay_all" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <DollarSign className="h-4 w-4" />
                One Person Pays All
              </div>
              <p className="text-sm text-muted-foreground">
                One person covers the entire bill (${totalAmount.toFixed(2)})
              </p>
            </Label>
          </div>

          {/* Custom split - only for group leaders */}
          {isGroupLeader && (
            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem value="custom_split" id="custom_split" />
              <Label htmlFor="custom_split" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium">
                  <DollarSign className="h-4 w-4" />
                  Custom Split
                </div>
                <p className="text-sm text-muted-foreground">
                  Customize how much each person pays
                </p>
              </Label>
            </div>
          )}
        </RadioGroup>

        {/* Custom split configuration */}
        {selectedStructure === 'custom_split' && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">Adjust amounts for each participant:</h4>
            {participants.map(participant => (
              <div key={participant._id} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium flex-1">
                  {participant.userName}
                  {participant._id === currentParticipantId && ' (You)'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={customSplits[participant._id] || 0}
                    onChange={(e) => handleCustomSplitChange(participant._id, parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-sm border rounded"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Total:</span>
              <span className={cn(
                "text-sm font-medium",
                Object.values(customSplits).reduce((sum, val) => sum + val, 0) === totalAmount
                  ? "text-green-600"
                  : "text-red-600"
              )}>
                ${Object.values(customSplits).reduce((sum, val) => sum + val, 0).toFixed(2)} / ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Who will pay (for pay_all option) */}
        {selectedStructure === 'pay_all' && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              The person who proceeds to checkout will pay for the entire group order.
            </p>
          </div>
        )}

        <Button 
          onClick={handleConfirm} 
          className="w-full"
          disabled={
            selectedStructure === 'custom_split' && 
            Math.abs(Object.values(customSplits).reduce((sum, val) => sum + val, 0) - totalAmount) > 0.01
          }
        >
          Confirm Payment Structure
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentStructureSelector;
