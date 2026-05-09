"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, X, Send, ShoppingCart, Volume2, VolumeX, Bot, ChevronDown } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
}

type SpeechRecognitionType = typeof SpeechRecognition;

const GREETING = `G'day! 👋 I'm Dish, your personal food assistant at Dishly.

I can help you:
🍽️ Discover dishes & recommendations
🥗 Find vegetarian or allergy-friendly options
🛒 Add items to your cart by voice or text
💬 Answer any questions about our menu

What are you in the mood for today?`;

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: GREETING, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = useCartStore((s) => s.getItemCount());

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track unread when closed
  useEffect(() => {
    if (!open && messages.length > 1) {
      setUnread((u) => u + 1);
    }
  }, [messages]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_~`#]/g, "").replace(/ACTION:\{[^}]+\}/g, "");
    const utterance = new SpeechSynthesisUtterance(clean.slice(0, 300));
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;
    // Prefer a female English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
      || voices.find((v) => v.lang.startsWith("en-AU"))
      || voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim(), timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          cartItems: cartItems.map((i) => ({ menuItemId: i.menuItemId, name: i.name, price: i.price, quantity: i.quantity, isVeg: i.isVeg })),
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Execute actions
      if (data.actions?.length) {
        for (const action of data.actions) {
          if (action.type === "addToCart" && action.item) {
            addItem(action.item as CartItem & { id?: string });
            toast.success(`${action.item.name} added to cart! 🛒`);
          }
          if (action.type === "navigate" && action.url === "/cart") {
            setTimeout(() => window.location.href = "/cart", 1500);
          }
        }
      }

      // Speak the reply
      speak(data.reply);

    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I had trouble connecting. Please try again! 🙏",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, loading, cartItems, addItem, speak]);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Voice not supported in this browser. Use Chrome.");
      return;
    }
    const SR = (window as Window & { SpeechRecognition?: SpeechRecognitionType; webkitSpeechRecognition?: SpeechRecognitionType }).SpeechRecognition
            || (window as Window & { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition;
    if (!SR) return;

    window.speechSynthesis?.cancel();
    const recognition = new SR();
    recognition.lang = "en-AU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      setListening(false);
      setInput(text);
      sendMessage(text);
    };
    recognition.onerror = () => { setListening(false); toast.error("Couldn't hear that. Try again!"); };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  }, [sendMessage]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatContent = (text: string) => {
    // Simple markdown-lite: bold **text**, bullet •
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i} className="block">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="font-semibold text-[#FF6B00]">{part}</strong> : part
          )}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 shadow-2xl transition-all ${
          open ? "hidden" : "flex"
        } bg-[#1A0A00] text-white pl-4 pr-5 py-3 rounded-2xl hover:bg-[#2A1500] border border-[#FF6B00]/40`}
      >
        <div className="relative">
          <div className="w-9 h-9 bg-[#FF6B00] rounded-xl flex items-center justify-center">
            <Bot size={18} />
          </div>
          {speaking && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        <div className="text-left">
          <div className="text-sm font-bold leading-tight">Priya</div>
          <div className="text-xs text-[#FF8C38]">AI Food Assistant</div>
        </div>
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[400px] h-[600px] sm:h-[580px] flex flex-col bg-[#1A0A00] sm:rounded-2xl shadow-2xl border border-[#FF6B00]/30 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#2A1500] border-b border-[#FF6B00]/20 shrink-0">
            <div className="relative">
              <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center text-white text-lg font-bold">
                🍛
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2A1500]" />
            </div>
            <div className="flex-1">
              <div className="text-white font-bold text-sm">Priya</div>
              <div className="text-[#FF8C38] text-xs flex items-center gap-1">
                {speaking ? (
                  <><Volume2 size={10} className="animate-pulse" /> Speaking...</>
                ) : listening ? (
                  <><Mic size={10} className="text-red-400 animate-pulse" /> Listening...</>
                ) : (
                  <>AI Food Assistant · Online</>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Cart pill */}
              {cartCount > 0 && (
                <a href="/cart" className="flex items-center gap-1 bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FF8C38] px-2 py-1 rounded-lg text-xs font-medium">
                  <ShoppingCart size={12} /> {cartCount}
                </a>
              )}
              <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="text-gray-400 hover:text-white transition-colors p-1" title={voiceEnabled ? "Mute Priya" : "Unmute Priya"}>
                {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1">
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center text-sm mr-2 mt-0.5 shrink-0">🍛</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#FF6B00] text-white rounded-tr-sm"
                    : "bg-[#2A1500] text-gray-200 rounded-tl-sm border border-[#FF6B00]/10"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="space-y-0.5">{formatContent(msg.content)}</div>
                  ) : (
                    msg.content
                  )}
                  <div className={`text-xs mt-1.5 ${msg.role === "user" ? "text-orange-200" : "text-gray-500"}`}>
                    {msg.timestamp.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center text-sm mr-2 shrink-0">🍛</div>
                <div className="bg-[#2A1500] border border-[#FF6B00]/10 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-[#FF6B00] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto shrink-0 border-t border-[#FF6B00]/10">
            {["What's popular?", "Vegetarian options", "Add Butter Chicken", "View my cart"].map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                className="px-3 py-1.5 bg-[#2A1500] border border-[#FF6B00]/20 text-[#FF8C38] rounded-full text-xs whitespace-nowrap hover:border-[#FF6B00] hover:bg-[#3A2000] transition-all disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="px-4 py-3 bg-[#2A1500] border-t border-[#FF6B00]/20 shrink-0">
            <div className="flex items-center gap-2">
              {/* Voice button */}
              <button
                onMouseDown={startListening}
                onMouseUp={listening ? stopListening : undefined}
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-50 ${
                  listening
                    ? "bg-red-500 shadow-lg shadow-red-500/40 animate-pulse"
                    : "bg-[#FF6B00] hover:bg-[#CC5500]"
                }`}
                title={listening ? "Stop listening" : "Speak your order"}
              >
                {listening ? <MicOff size={16} className="text-white" /> : <Mic size={16} className="text-white" />}
                {listening && (
                  <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-60" />
                )}
              </button>

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={listening ? "Listening..." : "Ask me anything or say your order..."}
                disabled={loading || listening}
                className="flex-1 bg-[#1A0A00] border border-[#FF6B00]/20 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF6B00] transition-colors disabled:opacity-60"
              />

              {/* Send button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center hover:bg-[#CC5500] transition-colors disabled:opacity-40 shrink-0"
              >
                <Send size={15} className="text-white" />
              </button>
            </div>
            <p className="text-center text-xs text-gray-600 mt-2">
              🎙️ Tap the mic and speak, or type your message
            </p>
          </div>
        </div>
      )}

      {/* Close overlay on mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
