import { useState, useEffect } from 'react';
import { Plus, RefreshCw, DollarSign } from 'lucide-react';
import { GlassCard } from './components/GlassCard';
import { NeonButton } from './components/NeonButton';
import { HaikuEntry } from './components/HaikuEntry';
import { WalletConnect } from './components/WalletConnect';
import { WalletProvider, useWallet } from './hooks/useWallet';
import { saveHaiku, listUserHaiku, fundWallet, getHaikuUrl } from './lib/irys';
import type { HaikuData } from './lib/types';
import './App.css';

function AppContent() {
  const wallet = useWallet();
  const [topic, setTopic] = useState('');
  const [generatedHaiku, setGeneratedHaiku] = useState('');
  const [haikus, setHaikus] = useState<HaikuData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isLoadingHaikus, setIsLoadingHaikus] = useState(false);
  const [savedHaikuId, setSavedHaikuId] = useState<string>('');

  const needsFunding = wallet.isConnected && parseFloat(wallet.balance) < 0.002;

  const loadHaikus = async () => {
    if (!wallet.address) return;
    
    setIsLoadingHaikus(true);
    try {
      const userHaikus = await listUserHaiku(wallet.address);
      setHaikus(userHaikus);
    } catch (error) {
      console.error('Failed to load haikus:', error);
    } finally {
      setIsLoadingHaikus(false);
    }
  };

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadHaikus();
    }
  }, [wallet.isConnected, wallet.address]);

  const handleGenerateHaiku = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generateHaiku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) throw new Error('Failed to generate haiku');
      
      const data = await response.json();
      setGeneratedHaiku(data.haiku);
      setSavedHaikuId('');
    } catch (error) {
      console.error('Error generating haiku:', error);
      // Fallback haiku
      setGeneratedHaiku(`${topic} whispers soft\nNature's gentle melody\nPeace flows through my soul`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveHaiku = async () => {
    if (!generatedHaiku || !wallet.address) return;

    setIsSaving(true);
    try {
      const result = await saveHaiku(generatedHaiku, topic);
      setSavedHaikuId(result.id);
      
      // Refresh balance and haikus
      await wallet.refreshBalance();
      await loadHaikus();
      
      // Clear form
      setTopic('');
      setGeneratedHaiku('');
    } catch (error) {
      console.error('Error saving haiku:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFund = async () => {
    setIsFunding(true);
    try {
      await fundWallet(0.01);
      await wallet.refreshBalance();
    } catch (error) {
      console.error('Error funding wallet:', error);
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className="min-h-screen bg-irys-dark text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold font-mono mb-4 bg-gradient-to-r from-irys-cyan to-cyan-400 bg-clip-text text-transparent">
            🌸 Irys Haiku Journal
          </h1>
          <p className="text-xl text-gray-300">
            AI-powered haiku creation on the permanent web
          </p>
        </header>

        {/* Wallet Connection */}
        <div className="mb-8 flex justify-center">
          <GlassCard className="text-center">
            <WalletConnect />
            {needsFunding && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-400 text-sm mb-2">
                  ⚠️ Low balance. Fund your wallet to save haikus.
                </p>
                <NeonButton
                  onClick={handleFund}
                  isLoading={isFunding}
                  variant="secondary"
                  className="text-sm"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fund 0.01 {wallet.tokenSymbol}
                </NeonButton>
              </div>
            )}
          </GlassCard>
        </div>

        {wallet.isConnected && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Haiku Creation */}
            <div className="space-y-6">
              <GlassCard>
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                      <span>✨</span>
                      Create Haiku
                    </h2>
                    <p className="text-gray-400">
                      Enter a topic and let AI craft a beautiful haiku
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Topic or Theme
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., cherry blossoms, moonlight, ocean waves..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-irys-cyan"
                        onKeyPress={(e) => e.key === 'Enter' && handleGenerateHaiku()}
                      />
                    </div>

                    <NeonButton
                      onClick={handleGenerateHaiku}
                      disabled={!topic.trim() || isGenerating}
                      isLoading={isGenerating}
                      className="w-full"
                    >
                      Generate Haiku
                    </NeonButton>

                    {generatedHaiku && (
                      <div className="mt-6 space-y-4">
                        <div className="p-4 bg-white/5 rounded-lg border border-irys-cyan/30">
                          <pre className="font-mono text-white whitespace-pre-wrap">
                            {generatedHaiku}
                          </pre>
                        </div>
                        
                        <NeonButton
                          onClick={handleSaveHaiku}
                          disabled={isSaving || needsFunding}
                          isLoading={isSaving}
                          className="w-full"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Save to Irys
                        </NeonButton>

                        {savedHaikuId && (
                          <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                            <p className="text-green-400 text-sm">
                              ✅ Haiku saved permanently!
                            </p>
                            <a
                              href={getHaikuUrl(savedHaikuId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-irys-cyan hover:underline text-sm"
                            >
                              View on Irys →
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Haiku History */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span>📝</span>
                  Your Haiku Journal
                </h2>
                <button
                  onClick={loadHaikus}
                  disabled={isLoadingHaikus}
                  className="p-2 hover:text-irys-cyan transition-colors"
                  title="Reload from blockchain"
                >
                  <RefreshCw 
                    size={20} 
                    className={isLoadingHaikus ? 'animate-spin' : ''} 
                  />
                </button>
              </div>

              {isLoadingHaikus ? (
                <GlassCard className="text-center py-8">
                  <div className="animate-spin text-4xl mb-4">⟳</div>
                  <p className="text-gray-400">Loading haikus from blockchain...</p>
                </GlassCard>
              ) : haikus.length === 0 ? (
                <GlassCard className="text-center py-8">
                  <p className="text-gray-400">
                    No haikus yet. Create your first one!
                  </p>
                </GlassCard>
              ) : (
                <div className="space-y-4">
                  {haikus.map((haiku) => (
                    <HaikuEntry key={haiku.id} haiku={haiku} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}