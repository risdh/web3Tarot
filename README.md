# 塔罗命运 - Tarot Fate Web3 DApp

[English](#english) | [中文](#chinese)

---

<a name="chinese"></a>
## 🔮 项目简介

塔罗命运是一个基于区块链的塔罗牌占卜游戏，结合了 Web3 技术和传统塔罗文化。玩家可以通过抽卡、合成、质押等方式参与游戏，并获得 NFT 奖励和代币收益。

### ✨ 核心特性

- **🎴 AI 占卜系统**：通过支付 BNB 或使用占卜卷进行单抽或三连抽，获取随机塔罗卡牌
- **🎯 卡牌稀有度**：包含普通、稀有、英雄、传说四个等级的卡牌
- **⚗️ 卡牌合成**：将低级卡牌合成为更高稀有度的卡牌
- **🔥 销毁系统**：销毁 3 张普通卡牌可获得 1 张占卜卷
- **💎 鉴定系统**：对卡牌进行鉴定评分，提高分数可获得更多分红
- **🖼️ NFT 铸造**：将高价值卡牌铸造为链上 NFT
- **💰 质押池**：质押 FS（命星）代币，赚取 BNB 分红
- **🏺 命星罐**：每次 BNB 抽卡的 20% 用于回购 FS 代币到奖池，当新传说 NFT 铸造时自动分配给持有者
- **🤝 邀请系统**：邀请好友参与游戏获得奖励
- **🔐 钱包连接**：支持通过 RainbowKit 连接多种 Web3 钱包

### 🛠️ 技术栈

- **前端框架**：[Next.js 16](https://nextjs.org/) - React 服务端渲染框架
- **样式方案**：[Tailwind CSS 4](https://tailwindcss.com/) - 实用优先的 CSS 框架
- **Web3 集成**：
  - [Wagmi](https://wagmi.sh/) - React Hooks for Ethereum
  - [Viem](https://viem.sh/) - TypeScript Interface for Ethereum
  - [RainbowKit](https://www.rainbowkit.com/) - 钱包连接 UI 组件
  - [Ethers.js](https://docs.ethers.org/) - 以太坊交互库
- **区块链网络**：BSC (Binance Smart Chain) 主网和测试网
- **3D 效果**：[OGL](https://oframe.github.io/ogl/) - 轻量级 WebGL 库
- **HTTP 请求**：[Axios](https://axios-http.com/)
- **开发工具**：ESLint、PostCSS

### 🚀 快速开始

#### 环境要求

- Node.js 16.x 或更高版本
- npm、yarn、pnpm 或 bun 包管理器
- Web3 钱包（如 MetaMask）

#### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

#### 配置环境

1. 在项目根目录创建 `.env.local` 文件
2. 配置必要的环境变量（如后端 API 地址、合约地址等）

#### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

#### 构建生产版本

```bash
npm run build
npm run start
```

### 📁 项目结构

```
frontend/
├── components/          # React 组件
│   ├── DivinationView.js    # 占卜视图
│   ├── InventoryView.js     # 仓库视图
│   ├── PoolView.js          # 质押池视图
│   ├── CardItem.js          # 卡牌组件
│   ├── SelectionGrid.js     # 选择网格
│   └── Particles.js         # 粒子特效
├── pages/               # Next.js 页面
│   ├── index.js            # 主页面
│   ├── admin.js            # 管理页面
│   ├── _app.js             # App 配置
│   └── _document.js        # Document 配置
├── utils/               # 工具函数
│   └── contract.js         # 智能合约交互
├── src/                 # 源代码
│   └── contracts/          # 合约 ABI
├── styles/              # 样式文件
├── public/              # 静态资源
└── ...配置文件
```

### 🎮 使用指南

1. **连接钱包**：点击右上角"连接钱包"按钮，连接您的 Web3 钱包
2. **抽卡占卜**：在"AI占卜"页面选择单抽或三连抽，支付 BNB 或使用占卜卷
3. **查看仓库**：在"仓库"页面查看您拥有的所有卡牌
4. **合成卡牌**：选择低级卡牌进行合成，获得更高稀有度的卡牌
5. **鉴定卡牌**：对卡牌进行鉴定，提高评分以获得更多分红
6. **铸造 NFT**：将高价值卡牌铸造为 NFT（即将推出）
7. **质押挖矿**：在质押池中质押 FS 代币，赚取 BNB 收益
8. **邀请好友**：通过邀请链接邀请好友，获得额外奖励

### 🔗 智能合约

项目涉及的主要智能合约：
- **FateStar Token (FS)**：游戏代币
- **Tarot Staking**：质押合约
- **Tarot Game**：游戏逻辑合约

### 📄 License

本项目为私有项目，版权所有。

---

<a name="english"></a>
## 🔮 Project Introduction

Tarot Fate is a blockchain-based tarot card divination game that combines Web3 technology with traditional tarot culture. Players can participate through card drawing, synthesis, staking, and earn NFT rewards and token dividends.

### ✨ Core Features

- **🎴 AI Divination System**: Pay with BNB or use tickets to draw single or triple cards, obtain random tarot cards
- **🎯 Card Rarity**: Includes Common, Rare, Hero, and Legend level cards
- **⚗️ Card Synthesis**: Combine lower-tier cards into higher rarity cards
- **🔥 Burn System**: Burn 3 Common cards to get 1 divination ticket
- **💎 Appraisal System**: Appraise cards to increase scores and earn more dividends
- **🖼️ NFT Minting**: Mint high-value cards as on-chain NFTs
- **💰 Staking Pool**: Stake FS (FateStar) tokens to earn BNB dividends
- **🏺 FS Jar**: 20% of each BNB draw goes to buyback FS tokens into the jar, automatically distributed to holders when new Legend NFTs are minted
- **🤝 Invite System**: Invite friends to participate and earn rewards
- **🔐 Wallet Connection**: Support multiple Web3 wallets via RainbowKit

### 🛠️ Tech Stack

- **Frontend Framework**: [Next.js 16](https://nextjs.org/) - React server-side rendering framework
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS framework
- **Web3 Integration**:
  - [Wagmi](https://wagmi.sh/) - React Hooks for Ethereum
  - [Viem](https://viem.sh/) - TypeScript Interface for Ethereum
  - [RainbowKit](https://www.rainbowkit.com/) - Wallet connection UI components
  - [Ethers.js](https://docs.ethers.org/) - Ethereum interaction library
- **Blockchain Networks**: BSC (Binance Smart Chain) mainnet and testnet
- **3D Effects**: [OGL](https://oframe.github.io/ogl/) - Lightweight WebGL library
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Development Tools**: ESLint, PostCSS

### 🚀 Quick Start

#### Requirements

- Node.js 16.x or higher
- npm, yarn, pnpm, or bun package manager
- Web3 wallet (e.g., MetaMask)

#### Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

#### Configuration

1. Create a `.env.local` file in the project root
2. Configure necessary environment variables (e.g., backend API URL, contract addresses)

#### Start Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open your browser and visit [http://localhost:3000](http://localhost:3000)

#### Build for Production

```bash
npm run build
npm run start
```

### 📁 Project Structure

```
frontend/
├── components/          # React components
│   ├── DivinationView.js    # Divination view
│   ├── InventoryView.js     # Inventory view
│   ├── PoolView.js          # Staking pool view
│   ├── CardItem.js          # Card component
│   ├── SelectionGrid.js     # Selection grid
│   └── Particles.js         # Particle effects
├── pages/               # Next.js pages
│   ├── index.js            # Main page
│   ├── admin.js            # Admin page
│   ├── _app.js             # App configuration
│   └── _document.js        # Document configuration
├── utils/               # Utility functions
│   └── contract.js         # Smart contract interactions
├── src/                 # Source code
│   └── contracts/          # Contract ABIs
├── styles/              # Style files
├── public/              # Static assets
└── ...configuration files
```

### 🎮 User Guide

1. **Connect Wallet**: Click the "Connect Wallet" button in the top-right corner to connect your Web3 wallet
2. **Draw Cards**: Go to the "Divination" page to choose single or triple draw, pay with BNB or use tickets
3. **View Inventory**: Check all your cards in the "Inventory" page
4. **Synthesize Cards**: Select lower-tier cards to synthesize higher rarity cards
5. **Appraise Cards**: Appraise cards to increase scores for more dividends
6. **Mint NFTs**: Mint high-value cards as NFTs (coming soon)
7. **Stake Tokens**: Stake FS tokens in the staking pool to earn BNB rewards
8. **Invite Friends**: Use invite links to invite friends and earn extra rewards

### 🔗 Smart Contracts

Main smart contracts involved:
- **FateStar Token (FS)**: Game token
- **Tarot Staking**: Staking contract
- **Tarot Game**: Game logic contract

### 📄 License

This is a private project. All rights reserved.

---

## 🔧 Development

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
