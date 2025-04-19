import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  return (
    <AnimatePresence>
      {!isOpen ? (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Bot className="h-5 w-5" />
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className="bg-background rounded-lg shadow-xl w-[350px] border flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">SpendAI Assistant</h3>
                  <p className="text-xs text-muted-foreground">Ask about your finances</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted rounded-full"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="h-[400px] overflow-y-auto p-4">
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                <p>How can I help with your finances today?</p>
              </div>
            </div>
            
            <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <form className="flex gap-2">
                <Input
                  placeholder="Ask about your finances..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
                />
                <Button type="submit" size="icon" className="rounded-full">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 