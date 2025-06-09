import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Wand2, X, Send, Clock, Users, Flame, Loader2, Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import aiService, { AIService, type StreamingChunk, type MenuItem } from '@/services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'thinking' | 'items';
  content: string;
  timestamp: Date;
  items?: MenuItem[];
  suggestions?: string[];
  isStreaming?: boolean;
  isComplete?: boolean;
}

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg p-3 max-w-[80%]">
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-xs text-gray-400">AI is thinking...</span>
      </div>
    </div>
  </div>
);

const ThinkingMessage: React.FC<{ content: string }> = ({ content }) => (
  <div className="flex items-center space-x-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg my-2">
    <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
    <span className="text-blue-700 text-sm italic">{content}</span>
  </div>
);

const MenuItemCard: React.FC<{ 
  item: MenuItem; 
  onAddToCart?: (item: MenuItem) => void;
  compact?: boolean;
}> = ({ item, onAddToCart, compact = false }) => {
  const dietaryInfo = AIService.getDietaryInfo(item);
  const spiceEmoji = AIService.getSpiceLevelEmoji(item.spiceLevel);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart && item.isAvailable) {
      onAddToCart(item);
    }
  };

  const handleCardClick = () => {
    if (onAddToCart && item.isAvailable) {
      onAddToCart(item);
    }
  };

  return (
    <div 
      className={cn(
        "border border-gray-700 rounded-lg overflow-hidden hover:shadow-lg hover:border-purple-500 transition-all bg-gray-800/50",
        compact ? "p-3" : "p-4",
        item.isAvailable ? "cursor-pointer hover:bg-gray-700/50" : "opacity-50 cursor-not-allowed"
      )}
      onClick={handleCardClick}
    >
      {item.image && (
        <img 
          src={item.image} 
          alt={item.name}
          className={cn(
            "w-full object-cover rounded-md mb-3",
            compact ? "h-24" : "h-32"
          )}
        />
      )}
      
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <h4 className={cn(
            "font-semibold text-white",
            compact ? "text-sm" : "text-base"
          )}>
            {item.name} {spiceEmoji}
          </h4>
          <span className="font-bold text-green-400">
            {AIService.formatPrice(item.price)}
          </span>
        </div>
        
        <p className={cn(
          "text-gray-300",
          compact ? "text-xs line-clamp-2" : "text-sm line-clamp-3"
        )}>
          {item.description}
        </p>
        
        <div className="flex flex-wrap gap-1">
          {dietaryInfo.map((info) => (
            <span
              key={info}
              className="px-2 py-1 bg-green-900/50 border border-green-700 text-green-300 text-xs rounded-full"
            >
              {info}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{(item as any).preparationTime ? `${(item as any).preparationTime} min` : '15 min'}</span>
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={handleAddToCart}
            className={cn(
              "text-xs px-3 py-1",
              item.isAvailable 
                ? "bg-purple-600 hover:bg-purple-700 text-white" 
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            )}
            disabled={!item.isAvailable}
          >
            {item.isAvailable ? 'Add to Cart' : 'Unavailable'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const StreamingMessage: React.FC<{ 
  content: string; 
  isComplete: boolean;
  items?: MenuItem[];
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  onAddToCart?: (item: MenuItem) => void;
}> = ({ content, isComplete, items, suggestions, onSuggestionClick, onAddToCart }) => {
  return (
    <div className="space-y-3">
      {/* AI Response */}
      {content && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          {!isComplete && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1 align-middle" />
          )}
        </div>
      )}
      
      {/* Menu Items */}
      {items && items.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Recommended Items</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <MenuItemCard
                key={item._id}
                item={item}
                onAddToCart={onAddToCart}
                compact
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-4 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
          <h4 className="text-sm font-medium mb-2 text-gray-200">Quick suggestions:</h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSuggestionClick?.(suggestion)}
                className="text-xs border-gray-600 bg-gray-800 text-gray-200 hover:bg-purple-600 hover:border-purple-500 hover:text-white"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AIChatDrawer: React.FC<{ onAddToCart?: (item: MenuItem) => void }> = ({ onAddToCart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<Message | null>(null);
  const [aiHealth, setAiHealth] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  useEffect(() => {
    // Check AI service health when component mounts
    const checkHealth = async () => {
      try {
        const health = await aiService.getHealth();
        setAiHealth(health);
      } catch (error) {
        console.error('Failed to check AI health:', error);
      }
    };
    
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setCurrentStreamingMessage(null);

    try {
      const streamingMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        isComplete: false,
      };

      setCurrentStreamingMessage(streamingMessage);
      let finalMessage = { ...streamingMessage };

      // Generate a unique session ID for each message to avoid conversation mixing
      const currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Stream the AI response with session ID
      for await (const chunk of aiService.streamMessage(message, currentSessionId)) {
        switch (chunk.type) {
          case 'start':
            // Keep the streaming message as is
            break;

          case 'thinking':
            setCurrentStreamingMessage(prev => {
              if (!prev) return null;
              const updated = {
                ...prev,
                content: `*${chunk.content}*\n\n`,
              };
              finalMessage = updated;
              return updated;
            });
            break;

          case 'text':
            setCurrentStreamingMessage(prev => {
              if (!prev) return null;
              const updated = {
                ...prev,
                content: prev.content + (chunk.content || ''),
              };
              finalMessage = updated;
              return updated;
            });
            break;

          case 'items':
            setCurrentStreamingMessage(prev => {
              if (!prev) return null;
              const updated = {
                ...prev,
                items: chunk.items || [],
              };
              finalMessage = updated;
              return updated;
            });
            break;

          case 'suggestions':
            setCurrentStreamingMessage(prev => {
              if (!prev) return null;
              const updated = {
                ...prev,
                suggestions: chunk.suggestions || [],
              };
              finalMessage = updated;
              return updated;
            });
            break;

          case 'complete':
            finalMessage = {
              ...finalMessage,
              content: chunk.message || finalMessage.content,
              items: chunk.items || finalMessage.items,
              suggestions: chunk.suggestions || finalMessage.suggestions,
              isStreaming: false,
              isComplete: true,
            };
            setCurrentStreamingMessage(finalMessage);
            break;

          case 'error':
            finalMessage = {
              id: (Date.now() + 2).toString(),
              type: 'ai',
              content: chunk.message || 'Sorry, I encountered an error.',
              timestamp: new Date(),
              isStreaming: false,
              isComplete: true,
            };
            setCurrentStreamingMessage(finalMessage);
            break;
        }
      }

      // Move final streaming message to messages array
      setMessages(prev => [...prev, {
        ...finalMessage,
        isStreaming: false,
        isComplete: true,
      }]);
      setCurrentStreamingMessage(null);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        type: 'ai',
        content: 'Sorry, I\'m having trouble connecting to the AI service right now. Please try again.',
        timestamp: new Date(),
        isStreaming: false,
        isComplete: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      setCurrentStreamingMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentStreamingMessage(null);
  };

  const handleAddToCart = (item: MenuItem) => {
    if (onAddToCart) {
      onAddToCart(item);
      
      // Keep the AI chat drawer open for continued conversation
      // ItemDetailDrawer will be opened by the parent component
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button 
          size="icon"
          className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
        >
          <Wand2 className="h-6 w-6 text-white" />
        </Button>
      </DrawerTrigger>
      
      <DrawerContent className="h-[80vh] max-w-4xl mx-auto" style={{ backgroundColor: '#16141F', color: 'white' }}>
        <DrawerHeader className="border-b border-gray-700 bg-gray-800/50 flex flex-row items-center justify-between">
          <div>
            <DrawerTitle className="flex items-center space-x-2 text-white">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <span>INSEAT AI </span>
              </DrawerTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={clearChat} className="text-gray-300 hover:text-white hover:bg-gray-700">
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white hover:bg-gray-700">
              <X className="w-4 h-4" />
              </Button>
            </div>
          </DrawerHeader>
          
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#16141F' }}>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome Message */}
            {messages.length === 0 && !currentStreamingMessage && (
              <div className="text-center p-8 space-y-4">
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <Sparkles className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Welcome to INSEAT AI! 🍽️
                  </h3>
                  <p className="text-gray-300 mb-4">
                    I'm your intelligent food assistant. I can help you find the perfect dishes based on your preferences, dietary needs, and cravings!
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                    {[
                      'Show me spicy vegetarian options',
                      'What desserts do you have?',
                      'Something under $15',
                      'Surprise me with a recommendation'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSendMessage(suggestion)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg border border-gray-600 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message History */}
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div 
                  className={cn(
                    "max-w-[80%] rounded-lg p-3",
                    message.type === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-100'
                  )}
                >
                  {message.type === 'user' ? (
                    <p>{message.content}</p>
                  ) : (
                    <StreamingMessage
                      content={message.content}
                      isComplete={message.isComplete || false}
                      items={message.items}
                      suggestions={message.suggestions}
                      onSuggestionClick={handleSuggestionClick}
                      onAddToCart={handleAddToCart}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Current Streaming Message */}
            {currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-gray-800 border border-gray-700 text-gray-100 rounded-lg p-3">
                  <StreamingMessage
                    content={currentStreamingMessage.content}
                    isComplete={currentStreamingMessage.isComplete || false}
                    items={currentStreamingMessage.items}
                    suggestions={currentStreamingMessage.suggestions}
                    onSuggestionClick={handleSuggestionClick}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isLoading && !currentStreamingMessage && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="border-t border-gray-700 p-4" style={{ backgroundColor: '#16141F' }}>
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about our menu... (e.g., 'Show me vegan options')"
                disabled={isLoading}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
              />
              <Button 
                onClick={() => handleSendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AIChatDrawer;
