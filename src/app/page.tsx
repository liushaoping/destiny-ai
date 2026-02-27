"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Compass, Loader2, Lock, ArrowRight, Star, Sparkles, RefreshCcw, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

// --- 1. 经典韦特塔罗牌数据 (高清公有领域图片) ---
const TAROT_DECK = [
  { name: "The Fool", element: "Air", image: "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg" },
  { name: "The Magician", element: "Air", image: "https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg" },
  { name: "The High Priestess", element: "Water", image: "https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg" },
  { name: "The Empress", element: "Earth", image: "https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg" },
  { name: "The Emperor", element: "Fire", image: "https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg" },
  { name: "The Lovers", element: "Air", image: "https://upload.wikimedia.org/wikipedia/commons/3/3a/RWS_Tarot_06_Lovers.jpg" },
  { name: "The Wheel of Fortune", element: "Fire", image: "https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg" },
  { name: "The Star", element: "Air", image: "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg" },
  { name: "The Sun", element: "Fire", image: "https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg" }
];

// 使用 Suspense 包裹以支持 useSearchParams
function TarotContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'form' | 'draw' | 'reading'>('form');
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: '', gender: 'female', birthDate: '', question: '' });
  const [isPaid, setIsPaid] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 检测 Stripe 支付成功回调
  useEffect(() => {
    const session = searchParams.get('session');
    if (session === 'success') {
      setIsPaid(true);
      // 如果有缓存的表单和牌面，可以自动进入阅读模式
      const savedData = localStorage.getItem('pendingReading');
      if (savedData) {
        const { form, cards } = JSON.parse(savedData);
        setFormData(form);
        setSelectedCards(cards);
        // 此处可自动触发 getReading(true)
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [reading]);

  const handleStartDraw = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('draw');
  };

  const handleCardClick = (card: any) => {
    if (selectedCards.includes(card)) return;
    if (selectedCards.length < 3) {
      setSelectedCards([...selectedCards, card]);
    }
  };

  // 在 getReading 函数内进行如下修改：
  const getReading = async (paidOverride = false) => {
    const finalPaidStatus = paidOverride || isPaid;
    setStep('reading');
    setLoading(true);
    setReading('');
    setShowPaywall(false);

    // 1. 缓存当前状态以便支付后回来恢复
    localStorage.setItem('pendingReading', JSON.stringify({
      form: formData,
      cards: selectedCards
    }));

    try {
      const res = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cards: selectedCards,
          isPaid: finalPaidStatus
        }),
      });

      if (!res.ok) throw new Error("Connection failed");
      if (!res.body) return;

      setLoading(false); // 🔥 在流开始前关闭 Loading 动画，露出文字区

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = ''; // 用于内部判断 Paywall

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // 🔥 打字机效果核心：逐字更新状态
        // 如果未支付且遇到了 Paywall 标记，截断并显示支付弹窗
        if (!finalPaidStatus && accumulatedText.includes('---PAYWALL---')) {
          const parts = accumulatedText.split('---PAYWALL---');
          setReading(parts[0]); // 只显示第一部分
          setShowPaywall(true);
          reader.cancel(); // 停止读取后续流
          break;
        }

        // 实时更新文字状态，触发 React 渲染
        setReading(accumulatedText);
      }
    } catch (err) {
      setLoading(false);
      console.error("❌ Oracle Error:", err);
      alert("Celestial interference. Please try again.");
    }
  };

  return (
      <div className="min-h-screen bg-[#0a0612] text-purple-100 font-sans selection:bg-purple-500/30">
        {/* Header */}
        <header className="p-5 flex justify-between items-center border-b border-purple-900/30 bg-black/40 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            {step !== 'form' && step !== 'reading' && (
                <button onClick={() => setStep('form')} className="mr-2"><ChevronLeft className="w-5 h-5" /></button>
            )}
            <Compass className="w-5 h-5 text-purple-400" />
            <span className="font-bold tracking-widest text-sm uppercase">Aether Oracle</span>
          </div>
          {isPaid && <div className="text-[10px] bg-amber-500/20 border border-amber-500/50 px-2 py-1 rounded text-amber-500">PREMIUM ACCESS</div>}
        </header>

        <main className="max-w-md mx-auto p-6">

          {/* Step 1: Form */}
          {step === 'form' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center my-10">
                  <h1 className="text-3xl font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-100 to-indigo-400">Consult the Fate</h1>
                  <p className="text-purple-400/60 text-sm italic">Unlock the secrets hidden in your timeline.</p>
                </div>
                <form onSubmit={handleStartDraw} className="space-y-4">
                  <input
                      type="text" placeholder="Full Name" required
                      className="w-full bg-purple-950/20 border border-purple-800/40 rounded-2xl px-5 py-4 outline-none focus:border-purple-500 transition-all"
                      onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select
                        className="bg-purple-950/20 border border-purple-800/40 rounded-2xl px-5 py-4 outline-none"
                        onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="non-binary">Other</option>
                    </select>
                    <input
                        type="date" required
                        className="bg-purple-950/20 border border-purple-800/40 rounded-2xl px-5 py-4 outline-none text-sm"
                        onChange={e => setFormData({...formData, birthDate: e.target.value})}
                    />
                  </div>
                  <textarea
                      placeholder="What keeps you awake at night? (Career, Love, Health...)" required
                      className="w-full bg-purple-950/20 border border-purple-800/40 rounded-2xl px-5 py-4 h-32 outline-none focus:border-purple-500"
                      onChange={e => setFormData({...formData, question: e.target.value})}
                  />
                  <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-5 rounded-2xl font-bold text-lg shadow-xl shadow-purple-900/40 active:scale-95 transition-all">
                    Enter the Sacred Circle
                  </button>
                </form>
              </motion.div>
          )}

          {/* Step 2: Drawing Ceremony */}
          {step === 'draw' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <h2 className="text-xl font-bold mb-2">Focus Your Energy</h2>
                <p className="text-purple-400/60 text-xs mb-8 italic">Choose 3 cards that resonate with your question.</p>

                <div className="grid grid-cols-3 gap-4 mb-12">
                  {TAROT_DECK.map((card, i) => {
                    const isSelected = selectedCards.includes(card);
                    return (
                        <div
                            key={i}
                            className="aspect-[2/3] relative cursor-pointer"
                            style={{ perspective: "1000px" }}
                            onClick={() => handleCardClick(card)}
                        >
                          <motion.div
                              className="w-full h-full relative"
                              style={{ transformStyle: "preserve-3d" }}
                              animate={{ rotateY: isSelected ? 180 : 0 }}
                              transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                          >
                            {/* Back */}
                            <div
                                className="absolute inset-0 w-full h-full bg-[#1e132e] border-2 border-purple-800/40 rounded-xl flex flex-col items-center justify-center shadow-lg"
                                style={{ backfaceVisibility: "hidden" }}
                            >
                              <div className="absolute inset-1.5 border border-purple-500/10 rounded-lg"></div>
                              <Star className="w-5 h-5 text-purple-900 fill-current" />
                            </div>

                            {/* Front */}
                            <div
                                className="absolute inset-0 w-full h-full rounded-xl border-2 border-amber-500/50 overflow-hidden bg-black shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                            >
                              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                              <div className="absolute bottom-1 inset-x-0 text-[8px] font-bold text-amber-200 uppercase tracking-tighter">{card.name}</div>
                            </div>
                          </motion.div>
                        </div>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {selectedCards.length === 3 && (
                      <motion.button
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                          onClick={() => getReading()}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-extrabold py-5 rounded-2xl shadow-xl shadow-amber-900/20 flex items-center justify-center gap-2"
                      >
                        Reveal the Prophecy <Sparkles className="w-5 h-5" />
                      </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
          )}

          {/* Step 3: AI Reading */}
          {step === 'reading' && (
              <div className="relative pb-48">
                <div className="flex gap-3 justify-center mb-10 h-28">
                  {selectedCards.map((card, i) => (
                      <motion.div
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.2 }}
                          key={i} className="aspect-[2/3] relative rounded-lg border border-purple-500/30 overflow-hidden shadow-lg shadow-purple-500/10"
                      >
                        <img src={card.image} alt={card.name} className="w-full h-full object-cover opacity-70" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-2 text-center">
                          <div className="text-[10px] font-bold text-purple-100">{card.name}</div>
                        </div>
                      </motion.div>
                  ))}
                </div>

                <div ref={scrollRef} className="prose prose-invert italic font-serif text-lg leading-relaxed whitespace-pre-wrap text-purple-100/90 tracking-wide">
                  {reading}
                </div>

                {showPaywall && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0612] via-[#0a0612] to-transparent pt-24 z-40">
                      <div className="max-w-md mx-auto bg-[#1a1025]/95 border border-amber-500/40 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl">
                        <div className="mb-5 inline-block p-4 bg-amber-500/10 rounded-full border border-amber-500/20">
                          <Lock className="w-7 h-7 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-amber-50">Fate is Calling</h3>
                        <p className="text-sm text-purple-200/70 mb-8 leading-relaxed px-4">AI has detected a <span className="text-amber-400 font-bold underline decoration-amber-500/50">major timeline shift</span> based on your cards. Unlock the full 500-word roadmap.</p>
                        <button
                            onClick={() => window.location.href="https://buy.stripe.com/your_link"}
                            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-black font-extrabold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/30"
                        >
                          Get Full Reading $4.99 <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                )}
              </div>
          )}
        </main>

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0a0612]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center">
                <div className="relative">
                  <RefreshCcw className="w-16 h-16 text-purple-500 animate-spin mb-4 opacity-50" />
                  <Sparkles className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="font-serif italic text-xl text-purple-200">Consulting the Aether...</p>
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}

export default function TarotApp() {
  return (
      <Suspense fallback={<div className="min-h-screen bg-[#0a0612] flex items-center justify-center text-purple-500"><Loader2 className="animate-spin" /></div>}>
        <TarotContent />
      </Suspense>
  );
}