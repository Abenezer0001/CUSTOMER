import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Wand2, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export const AIChatDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi there! I'm your AI dining assistant. How can I help you today? I can recommend dishes based on your mood, dietary preferences, or cravings!",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response (in a real app, this would be an API call)
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: getAIResponse(inputValue),
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('recommend') || input.includes('suggest') || input.includes('what should i eat')) {
      return "I'd be happy to help! Could you tell me if you're in the mood for something specific? For example, are you looking for something light, spicy, or maybe a dessert?";
    } else if (input.includes('vegetarian') || input.includes('veggie')) {
      return "I'd recommend our Mediterranean Veggie Platter or the Portobello Mushroom Burger. Both are customer favorites! Would you like to know more about either?";
    } else if (input.includes('spicy') || input.includes('hot')) {
      return "Our Spicy Buffalo Wings and Thai Curry are both excellent choices if you like some heat. How spicy would you like it on a scale of 1-10?";
    } else if (input.includes('sweet') || input.includes('dessert')) {
      return "You're in for a treat! Our Chocolate Lava Cake and Tiramisu are both amazing. The lava cake comes with vanilla ice cream - would you like to add that to your order?";
    } else if (input.includes('gluten') || input.includes('dairy') || input.includes('allerg')) {
      return "We have several gluten-free and dairy-free options available. Our staff is trained to handle food allergies - would you like me to connect you with a server to discuss your specific needs?";
    } else if (input.includes('thank') || input.includes('thanks')) {
      return "You're welcome! Is there anything else I can help you with?";
    } else if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return "Hello! I'm here to help you choose something delicious. What are you in the mood for today?";
    } else {
      return "That sounds interesting! Could you tell me more about what you're looking for in a meal? For example, are you in the mood for something light, hearty, or perhaps a specific cuisine?";
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="fixed left-6 bottom-20 h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg z-40 transition-all hover:scale-110"
          aria-label="AI Dining Assistant"
        >
          <Wand2 className="h-6 w-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[80vh] max-h-[800px] bg-[#1F1D2B] border-t-2 border-purple-500/30 rounded-t-2xl">
        <div className="mx-auto w-full max-w-2xl h-full flex flex-col">
          <DrawerHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between w-full">
              <DrawerTitle className="text-white text-xl font-semibold flex items-center">
                <Wand2 className="h-5 w-5 mr-2 text-purple-400" />
                AI Dining Assistant
              </DrawerTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-purple-900/30"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-purple-300">Ask me for recommendations or dietary advice</p>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  'flex',
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div 
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2',
                    message.sender === 'user' 
                      ? 'bg-purple-600 text-white rounded-br-none' 
                      : 'bg-[#2D303E] text-gray-200 rounded-bl-none'
                  )}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-60 text-right">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 p-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-800">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me for recommendations or dietary advice..."
                className="w-full bg-[#2D303E] text-white placeholder-purple-300/50 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-purple-400 hover:text-white hover:bg-purple-600/50"
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-purple-300/60 mt-2 text-center">
              Try: "What's good for someone who loves spicy food?"
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AIChatDrawer;
