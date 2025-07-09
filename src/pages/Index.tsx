import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Sparkles, BookOpen, Plus, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { NeonButton } from "@/components/NeonButton";
import { HaikuEntry } from "@/components/HaikuEntry";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  connectWallet,
  getBalance,
  fundWallet,
  saveHaiku,
  listUserHaiku,
  generateHaiku,
  getTokenSymbol,
} from "@/lib/irys";
import type { WalletState, HaikuData } from "@/lib/types";

const Index = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    balance: "0",
    isLoading: false,
  });
  
  const [topic, setTopic] = useState("");
  const [generatedHaiku, setGeneratedHaiku] = useState("");
  const [haikus, setHaikus] = useState<HaikuData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isLoadingHaikus, setIsLoadingHaikus] = useState(false);
  const [tokenSymbol, setTokenSymbol] = useState("IRYS");
  const [activeTab, setActiveTab] = useState<"create" | "journal">("create");
  
  const { toast } = useToast();

  const loadHaikus = useCallback(async () => {
    if (!wallet.address) return;
    
    setIsLoadingHaikus(true);
    try {
      const userHaikus = await listUserHaiku(wallet.address);
      setHaikus(userHaikus);
    } catch (error) {
      console.error("Failed to load haikus:", error);
      toast({
        title: "Failed to load haikus",
        description: "Could not fetch haikus from blockchain",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHaikus(false);
    }
  }, [wallet.address, toast]);

  // Load wallet connection on mount
  useEffect(() => {
    const checkWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            handleConnectWallet();
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };
    checkWallet();
  }, []);

  // Load haikus when wallet connects
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadHaikus();
    }
  }, [wallet.isConnected, wallet.address, loadHaikus]);

  const handleConnectWallet = async () => {
    setWallet(prev => ({ ...prev, isLoading: true }));
    try {
      const address = await connectWallet();
      const [balance, symbol] = await Promise.all([
        getBalance(),
        getTokenSymbol()
      ]);
      
      setWallet({
        address,
        isConnected: true,
        balance,
        isLoading: false,
      });
      
      setTokenSymbol(symbol);

      toast({
        title: "Wallet connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });
    } catch (error) {
      setWallet(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleFundWallet = async () => {
    setIsFunding(true);
    try {
      await fundWallet(0.01); // Fund with 0.01 IRYS/ETH
      const balance = await getBalance();
      setWallet(prev => ({ ...prev, balance }));
      
      toast({
        title: "Wallet funded successfully",
        description: "You can now save haikus to Irys",
      });
    } catch (error) {
      toast({
        title: "Funding failed",
        description: error instanceof Error ? error.message : "Failed to fund wallet",
        variant: "destructive",
      });
    } finally {
      setIsFunding(false);
    }
  };

  const handleGenerateHaiku = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for your haiku",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const haiku = await generateHaiku(topic.trim());
      setGeneratedHaiku(haiku);
      
      toast({
        title: "Haiku generated",
        description: "Your AI-generated haiku is ready!",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate haiku",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveHaiku = async () => {
    if (!generatedHaiku || !wallet.address) return;

    const balance = parseFloat(wallet.balance);
    if (balance < 0.002) {
      toast({
        title: "Insufficient balance",
        description: "Please fund your wallet to save haikus",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveHaiku(generatedHaiku, topic, wallet.address);
      
      // Refresh balance and haikus
      const newBalance = await getBalance();
      setWallet(prev => ({ ...prev, balance: newBalance }));
      await loadHaikus();
      
      // Clear the form
      setTopic("");
      setGeneratedHaiku("");
      setActiveTab("journal");
      
      toast({
        title: "Haiku saved to Irys",
        description: "Your haiku is now permanently stored on the blockchain",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save haiku",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleReloadFromChain = () => {
    loadHaikus();
    toast({
      title: "Reloading from blockchain",
      description: "Fetching latest haikus from Irys...",
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-irys-dark-purple">
      {/* Background decoration */}
      <div className="fixed inset-0 bg-gradient-radial opacity-30 pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 bg-gradient-accent bg-clip-text text-transparent">
            Irys Haiku Journal
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered haiku creation on the permanent web
          </p>
        </motion.div>

        {/* Wallet Connection */}
        {!wallet.isConnected ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mb-8"
          >
            <GlassCard className="text-center">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="font-display text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Connect MetaMask to start creating and storing haikus on Irys
              </p>
              <NeonButton
                onClick={handleConnectWallet}
                disabled={wallet.isLoading}
                loading={wallet.isLoading}
                size="lg"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Connect MetaMask
              </NeonButton>
            </GlassCard>
          </motion.div>
        ) : (
          <>
            {/* Wallet Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <GlassCard className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="pulse-glow w-3 h-3 rounded-full bg-primary" />
                  <span className="font-display">Connected: {formatAddress(wallet.address!)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">Balance: {parseFloat(wallet.balance).toFixed(4)} {tokenSymbol}</span>
                  {parseFloat(wallet.balance) < 0.002 && (
                    <NeonButton
                      variant="secondary"
                      size="sm"
                      onClick={handleFundWallet}
                      loading={isFunding}
                    >
                      Fund Wallet
                    </NeonButton>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-8">
              <GlassCard className="p-2">
                <div className="flex gap-1">
                  <NeonButton
                    variant={activeTab === "create" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("create")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                  </NeonButton>
                  <NeonButton
                    variant={activeTab === "journal" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("journal")}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Journal ({haikus.length})
                  </NeonButton>
                </div>
              </GlassCard>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "create" ? (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="space-y-6">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <h2 className="font-display text-2xl font-bold mb-2">Create a Haiku</h2>
                      <p className="text-muted-foreground">
                        Enter a topic and let AI craft a beautiful haiku for you
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Topic</label>
                        <Input
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g., cherry blossoms, moonlight, ocean waves..."
                          className="glass-card border-primary/30 focus:border-primary"
                          onKeyPress={(e) => e.key === 'Enter' && !isGenerating && handleGenerateHaiku()}
                        />
                      </div>

                      <NeonButton
                        onClick={handleGenerateHaiku}
                        disabled={!topic.trim() || isGenerating}
                        loading={isGenerating}
                        className="w-full"
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Haiku
                      </NeonButton>

                      {/* Generated Haiku */}
                      <AnimatePresence>
                        {generatedHaiku && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-4"
                          >
                            <div className="glass-card p-6 text-center">
                              <div className="haiku-text mb-4">
                                {generatedHaiku.split('\n').map((line, i) => (
                                  <div key={i}>{line}</div>
                                ))}
                              </div>
                              <NeonButton
                                onClick={handleSaveHaiku}
                                disabled={isSaving || parseFloat(wallet.balance) < 0.002}
                                loading={isSaving}
                                size="lg"
                              >
                                Save to Irys Forever
                              </NeonButton>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : (
                <motion.div
                  key="journal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-6">
                    <div className="text-center">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <h2 className="font-display text-2xl font-bold mb-2">Your Haiku Journal</h2>
                      <p className="text-muted-foreground">
                        Your permanently stored haikus on the Irys blockchain
                      </p>
                      <NeonButton
                        variant="ghost"
                        size="sm"
                        onClick={handleReloadFromChain}
                        loading={isLoadingHaikus}
                        className="mt-4"
                      >
                        Reload from Chain
                      </NeonButton>
                    </div>

                    {haikus.length === 0 ? (
                      <GlassCard className="text-center py-12">
                        <p className="text-muted-foreground text-lg">
                          No haikus yet. Create your first one to get started!
                        </p>
                        <NeonButton
                          onClick={() => setActiveTab("create")}
                          className="mt-4"
                        >
                          Create Your First Haiku
                        </NeonButton>
                      </GlassCard>
                    ) : (
                      <div className="grid gap-6">
                        {haikus.map((haiku, index) => (
                          <HaikuEntry key={haiku.id} haiku={haiku} index={index} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;