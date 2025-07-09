# 🌸 Irys Haiku Journal

AI-powered haiku creation on the permanent web. Generate beautiful haikus with Claude AI and store them forever on the Irys blockchain.

![Irys Haiku Journal](https://github.com/yourusername/haiku-journal/assets/banner.png)

## ✨ Features

- 🎨 **AI-Powered Creation**: Generate haikus using Claude AI based on any topic
- 🔗 **Blockchain Storage**: Permanently store haikus on Irys/Arweave
- 👛 **MetaMask Integration**: Connect your wallet to manage your haikus
- 🔍 **On-Chain Verification**: Verify haiku authenticity with cryptographic receipts
- 📚 **Personal Journal**: View all your haikus fetched directly from the blockchain
- 🌐 **Shareable Links**: Each haiku gets a permanent URL

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask wallet
- Testnet IRYS tokens (get from [faucet](https://irys.xyz/faucet))

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/haiku-journal.git
   cd haiku-journal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. Run the development servers:
   ```bash
   # Terminal 1: API server
   npm run api
   
   # Terminal 2: Frontend
   npm run dev
   ```

5. Open http://localhost:5173

### Configuration

#### Network Setup

Add Irys Testnet to MetaMask:
- **Network Name**: Irys Testnet
- **RPC URL**: https://testnet-rpc.irys.xyz/v1
- **Chain ID**: 1270
- **Currency**: IRYS
- **Explorer**: https://testnet-explorer.irys.xyz

#### Getting Testnet Tokens

1. Visit [Irys Faucet](https://irys.xyz/faucet)
2. Enter your wallet address
3. Request testnet IRYS tokens

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom Glassmorphism
- **Blockchain**: Irys SDK + Ethers.js
- **AI**: Claude API (Anthropic)
- **Hosting**: Vercel

## 📝 Usage

1. **Connect Wallet**: Click "Connect MetaMask" and approve the connection
2. **Fund Account**: If balance is low, click "Fund 0.01 IRYS" 
3. **Create Haiku**: Enter a topic and click "Generate Haiku"
4. **Save to Blockchain**: Click "Save to Irys" to permanently store
5. **Share**: Copy the permanent link to share your haiku

## 🔧 Environment Variables

```bash
# Irys Configuration
VITE_IRYS_RPC_URL=https://testnet-rpc.irys.xyz/v1
VITE_IRYS_NETWORK=devnet
VITE_IRYS_GATEWAY=https://gateway.irys.xyz

# API Keys
ANTHROPIC_API_KEY=your-claude-api-key
```

## 📚 API Reference

### Generate Haiku
```
POST /api/generateHaiku
Body: { topic: string }
Response: { haiku: string }
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with ❤️ for the Irys ecosystem
- Powered by Claude AI and Arweave permanent storage
- Inspired by the Irys vibe coding community