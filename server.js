const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { ethers } = require('ethers');
require('dotenv').config();
const OpenAI = require('openai');
const { getConfig, updateConfig, clearConfigCache } = require('./adminConfig');

const openai = new OpenAI({
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1' 
});

// 1. Pinata 网关
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

// 2. 🔥 核心配置：已填入你提供的真实 CID
const RARITY_CIDS = {
    // Tier 1: 传说 (Legend)
    1: "bafybeibivkgpjwe55e6qr7zewfxhllqftntfjomrqoab7akns2s6ij4usq",
    
    // Tier 2: 英雄 (Hero)
    2: "bafybeic4wzdwa4xkyv2dv52z6jfxghm6twyoaw6x34qt3iad2ut4it6cna",
    
    // Tier 3: 稀有 (Rare)
    3: "bafybeianbsd34oyq6iwlpwb5mfioravzjacpg6jy4bqvvikukbjomwyiqq",
    
    // Tier 4: 普通 (Common)
    4: "bafybeigo4olca6otqxg4gme2stqrednrwxcx67v3jhihjiw264b6awxjni"
};

// 3. 🃏 塔罗牌数据表 (文件名必须精确匹配 IPFS)
const TAROT_DECK = [
    { id: 0, name: "The Fool", filename: "The Fool.png" }, 
    { id: 1, name: "The Magician", filename: "The Magician.png" }, 
    { id: 2, name: "The High Priestess", filename: "The High Priestess.png" }, 
    { id: 3, name: "The Empress", filename: "The Empress.png" }, 
    { id: 4, name: "The Emperor", filename: "The Emperor.png" }, 
    { id: 5, name: "The Hierophant", filename: "The Hierophant.png" }, 
    { id: 6, name: "The Lovers", filename: "The Lovers.png" }, 
    { id: 7, name: "The Chariot", filename: "The Chariot.png" }, 
    { id: 8, name: "Strength", filename: "Strength.png" }, 
    { id: 9, name: "The Hermit", filename: "The Hermit.png" }, 
    { id: 10, name: "Wheel of Fortune", filename: "Wheel of Fortune.png" }, 
    { id: 11, name: "Justice", filename: "Justice.png" }, 
    { id: 12, name: "The Hanged Man", filename: "The Hanged Man.png" }, 
    { id: 13, name: "Death", filename: "Death.png" }, 
    { id: 14, name: "Temperance", filename: "Temperance.png" }, 
    { id: 15, name: "The Devil", filename: "The Devil.png" }, 
    { id: 16, name: "The Tower", filename: "The Tower.png" }, 
    { id: 17, name: "The Star", filename: "The Star.png" }, 
    { id: 18, name: "The Moon", filename: "The Moon.png" }, 
    { id: 19, name: "The Sun", filename: "The Sun.png" }, 
    { id: 20, name: "Judgement", filename: "Judgement.png" }, 
    { id: 21, name: "The World", filename: "The World.png" } 
];

const NAME_MAPPING = {
    '愚者': 'The Fool.png',
    '魔术师': 'The Magician.png',
    '女祭司': 'The High Priestess.png',
    '皇后': 'The Empress.png',
    '皇帝': 'The Emperor.png',
    '教皇': 'The Hierophant.png',
    '恋人': 'The Lovers.png',
    '战车': 'The Chariot.png',
    '力量': 'Strength.png',
    '隐者': 'The Hermit.png',
    '命运之轮': 'Wheel of Fortune.png',
    '正义': 'Justice.png',
    '倒吊人': 'The Hanged Man.png',
    '死神': 'Death.png',
    '节制': 'Temperance.png',
    '恶魔': 'The Devil.png',
    '高塔': 'The Tower.png',
    '星辰': 'The Star.png',
    '月亮': 'The Moon.png',
    '太阳': 'The Sun.png',
    '审判': 'Judgement.png',
    '世界': 'The World.png'
};

// Helper: 动态修复卡牌图片 URL (确保前端总是显示最新的图片)
const fixCardData = (card) => {
    // 转换为普通对象，避免 Mongoose Document 限制
    const c = card.toObject ? card.toObject() : card;

    let filename = c.filename;
    
    // 兼容旧数据：如果没有 filename，尝试从 name 推断，或者随机分配
    if (!filename) {
        // 1. 尝试直接匹配英文名
        const match = TAROT_DECK.find(f => f.filename === c.filename || f.name === c.name || f.filename.replace('.png', '') === c.name);
        if (match) {
            filename = match.filename;
        } 
        // 2. 尝试匹配中文名映射
        else if (NAME_MAPPING[c.name]) {
            filename = NAME_MAPPING[c.name];
        }
        else {
            // 如果名字不匹配（旧数据的中文名等），根据 UUID 哈希固定分配一张
            const hash = crypto.createHash('md5').update(c.uuid).digest('hex');
            const idx = parseInt(hash.substring(0, 8), 16) % TAROT_DECK.length;
            filename = TAROT_DECK[idx].filename;
        }
    }

    if (filename) {
        // 根据要求：网站显示使用本地图片 (frontend/public/cards/...)
        // 目录结构映射: common -> Common, rare -> Rare, hero -> Hero, legend -> Legend
        const typeDirMap = {
            'common': 'Common',
            'rare': 'Rare',
            'hero': 'Hero',
            'legend': 'Legend'
        };
        const dir = typeDirMap[c.type] || 'Common';
        
        // Next.js 静态资源路径 (相对于 public 目录)
        c.img = `/cards/${dir}/${filename}`;
        c.filename = filename; 
    }
    return c;
};

let CARD_TEMPLATES;
try {
    CARD_TEMPLATES = require('./cardTemplates');
    console.log('✅ 卡牌模板加载成功');
} catch (e) {
    console.log('⚠️ cardTemplates.js 未找到，使用默认模板');
    CARD_TEMPLATES = {
        common: [{ name: '普通卡', img: '', desc: '一张普通的塔罗牌' }],
        rare:   [{ name: '稀有卡', img: '', desc: '一张稀有的塔罗牌' }],
        hero:   [{ name: '英雄卡', img: '', desc: '一张英雄的塔罗牌' }],
        legend: [{ name: '传说卡', img: '', desc: '一张传说的塔罗牌' }],
    };
}

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = "mongodb+srv://wenjianxinzero_db_user:Irr1tYIAEgOuwpKC@tluooai.s9zwnm4.mongodb.net/?appName=tluooai";
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB 连接成功！');
        // 自动更新 Treasury 地址为 Game Contract 地址 (确保分红机制正常工作)
        const config = await getConfig();
        if (config.treasuryAddress !== process.env.GAME_CONTRACT_ADDRESS) {
            console.log(`🔄 Updating Treasury Address: ${config.treasuryAddress} -> ${process.env.GAME_CONTRACT_ADDRESS}`);
            await updateConfig({ treasuryAddress: process.env.GAME_CONTRACT_ADDRESS });
        }
        
        // Update Price to 0.01
        if (config.drawPrice === 0.001) {
             console.log(`🔄 Updating Draw Price: 0.001 -> 0.01`);
             await updateConfig({ drawPrice: 0.01 });
        }
    })
    .catch(e => console.log('❌ MongoDB 连接失败:', e.message));

const CardSchema = new mongoose.Schema({
    uuid: { type: String, required: true },
    tokenId: { type: String, default: '' }, // 新增：保存 TokenID (用于 Metadata 反查)
    type: { type: String, required: true },
    name: { type: String, default: '' },
    img:  { type: String, default: '' },
    filename: { type: String, default: '' }, // 新增：保存原始文件名
    desc: { type: String, default: '' },
    score: { type: Number, default: 0 },
    rateCount: { type: Number, default: 0 },
    ratingHistory: [Number],
    minted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
    address: { type: String, required: true, unique: true },
    referralCode: { type: String, unique: true },
    drawTickets: { type: Number, default: 0 },
    mintTickets: { type: Number, default: 0 },
    fsBalance: { type: Number, default: 1000 },
    inventory: [CardSchema],
    stakedFs: { type: Number, default: 0 },
    stakeBnbRewards: { type: Number, default: 0 },
    stakedAt: { type: Date, default: null },
    // Invitation System
    referrer: { type: String, default: null },
    inviteRewardClaimed: { type: Boolean, default: false },
    referrals: [{
        address: String,
        joinedAt: { type: Date, default: Date.now },
        rewardClaimed: { type: Boolean, default: false }
    }]
});

const User = mongoose.model('User', UserSchema);

const JarSchema = new mongoose.Schema({
    totalFs: { type: Number, default: 0 },
    totalBnbCollected: { type: Number, default: 0 },
    lastDrawTime: { type: Date, default: null },
    drawHistory: [{
        time: Date, triggerCard: String, triggerOwner: String,
        totalFs: Number, legendShare: Number, otherLegendShare: Number,
        heroShare: Number, rareShare: Number,
        rewards: { type: Map, of: Number }
    }],
});
const Jar = mongoose.model('Jar', JarSchema);

const StakePoolSchema = new mongoose.Schema({
    totalStaked: { type: Number, default: 0 },
    totalBnbPool: { type: Number, default: 0 },
});
const StakePool = mongoose.model('StakePool', StakePoolSchema);

const CounterSchema = new mongoose.Schema({ name: String, seq: Number });
const Counter = mongoose.model('Counter', CounterSchema);

let globalEvents = [];

function cleanInventory(user) {
    const before = user.inventory.length;
    user.inventory = user.inventory.filter(c => c && c.uuid && c.type);
    if (before !== user.inventory.length) {
        console.log(`🧹 清理了 ${before - user.inventory.length} 条脏数据 (${user.address.slice(-4)})`);
        return true;
    }
    return false;
}

// ===== 使用动态配置的 generateCard =====
async function generateCard(forceType) {
    const config = await getConfig();
    let type = forceType;
    if (!type) {
        const rand = Math.floor(Math.random() * 10000);
        const { common, rare, hero, legend } = config.rates;
        type = 'common';
        if (rand >= 10000 - legend) type = 'legend';
        else if (rand >= 10000 - legend - hero) type = 'hero';
        else if (rand >= 10000 - legend - hero - rare) type = 'rare';
    }

    // 随机选一张牌
    const cardTemplate = TAROT_DECK[Math.floor(Math.random() * TAROT_DECK.length)];
    const filename = cardTemplate.filename;
    const name = cardTemplate.name;
    
    // 确定 Tier ID
    let tierId = 4;
    if (type === 'legend') tierId = 1;
    else if (type === 'hero') tierId = 2;
    else if (type === 'rare') tierId = 3;

    // 默认存本地路径 (前端显示用)
    // 实际 Metadata 接口会动态生成 IPFS 链接
    const typeDirMap = { 'common': 'Common', 'rare': 'Rare', 'hero': 'Hero', 'legend': 'Legend' };
    const dir = typeDirMap[type] || 'Common';
    const imgUrl = `/cards/${dir}/${filename}`;

    // 描述 (简单映射)
    const desc = `A ${type} card: ${name}`;

    return {
        uuid: `${type[0]}-${crypto.randomBytes(4).toString('hex')}`,
        type, 
        name, 
        img: imgUrl, 
        filename, // 存入数据库
        desc,
        score: 0, rateCount: 0, ratingHistory: [], minted: false
    };
}

async function getJar() {
    let jar = await Jar.findOne();
    if (!jar) jar = await new Jar().save();
    return jar;
}

async function getStakePool() {
    let pool = await StakePool.findOne();
    if (!pool) pool = await new StakePool().save();
    return pool;
}

// ===== 命星罐开奖 - 使用动态分配比例 =====
async function triggerJarDraw(triggerAddress, cardName, cardScore) {
    const config = await getConfig();
    const jar = await getJar();
    if (jar.totalFs <= 0) return;

    const pool = jar.totalFs;
    const dist = config.jarDistribution;
    
    // 基础份额
    const baseLegendShare = Math.floor(pool * dist.newLegend / 100);
    const otherLegendShare = Math.floor(pool * dist.otherLegend / 100);
    const heroShare = Math.floor(pool * dist.hero / 100);
    const rareShare = Math.floor(pool * dist.rare / 100);

    let distributed = 0;
    let userRewards = {}; // 记录每个人分了多少

    // 1. 触发者奖励 (根据评分打折: score/100)
    // 如果没有评分，默认按最低分处理(或者0分)? 暂时假设 score 必有值
    const scoreRatio = (cardScore || 0) / 100;
    const actualLegendShare = Math.floor(baseLegendShare * scoreRatio);

    const trigger = await User.findOne({ address: triggerAddress });
    if (trigger) { 
        trigger.fsBalance += actualLegendShare; 
        await trigger.save(); 
        distributed += actualLegendShare;
        userRewards[triggerAddress] = (userRewards[triggerAddress] || 0) + actualLegendShare;
    }

    const allUsers = await User.find({});

    // 辅助函数：计算用户持有的某类已铸造卡牌的总分
    const getUserScore = (user, type) => {
        return user.inventory
            .filter(c => c.type === type && c.minted)
            .reduce((sum, c) => sum + (c.score || 0), 0);
    };

    // 2. 其他传说卡持有者分红 (按持有卡牌总分权重分配)
    const legendHolders = allUsers.filter(u => u.address !== triggerAddress && u.inventory.some(c => c.type === 'legend' && c.minted));
    if (legendHolders.length > 0) {
        const totalScore = legendHolders.reduce((sum, u) => sum + getUserScore(u, 'legend'), 0);
        if (totalScore > 0) {
            for (const u of legendHolders) {
                const uScore = getUserScore(u, 'legend');
                const share = Math.floor(otherLegendShare * (uScore / totalScore));
                if (share > 0) {
                    u.fsBalance += share;
                    await u.save();
                    distributed += share;
                    userRewards[u.address] = (userRewards[u.address] || 0) + share;
                }
            }
        }
    }

    // 3. 英雄卡持有者分红
    const heroHolders = allUsers.filter(u => u.inventory.some(c => c.type === 'hero' && c.minted));
    if (heroHolders.length > 0) {
        const totalScore = heroHolders.reduce((sum, u) => sum + getUserScore(u, 'hero'), 0);
        if (totalScore > 0) {
            for (const u of heroHolders) {
                const uScore = getUserScore(u, 'hero');
                const share = Math.floor(heroShare * (uScore / totalScore));
                if (share > 0) {
                    u.fsBalance += share;
                    await u.save();
                    distributed += share;
                    userRewards[u.address] = (userRewards[u.address] || 0) + share;
                }
            }
        }
    }

    // 4. 稀有卡持有者分红
    const rareHolders = allUsers.filter(u => u.inventory.some(c => c.type === 'rare' && c.minted));
    if (rareHolders.length > 0) {
        const totalScore = rareHolders.reduce((sum, u) => sum + getUserScore(u, 'rare'), 0);
        if (totalScore > 0) {
            for (const u of rareHolders) {
                const uScore = getUserScore(u, 'rare');
                const share = Math.floor(rareShare * (uScore / totalScore));
                if (share > 0) {
                    u.fsBalance += share;
                    await u.save();
                    distributed += share;
                    userRewards[u.address] = (userRewards[u.address] || 0) + share;
                }
            }
        }
    }

    jar.drawHistory.unshift({ 
        time: new Date(), 
        triggerCard: cardName, 
        triggerOwner: triggerAddress, 
        totalFs: pool, 
        legendShare: actualLegendShare, 
        otherLegendShare, 
        heroShare, 
        rareShare,
        rewards: userRewards 
    });
    if (jar.drawHistory.length > 20) jar.drawHistory = jar.drawHistory.slice(0, 20);
    
    // 剩余未分配的资金保留在池中
    jar.totalFs -= distributed;
    if (jar.totalFs < 0) jar.totalFs = 0; // 安全校验

    jar.lastDrawTime = new Date();
    await jar.save();

    globalEvents.unshift({ type: 'legend', msg: `🏺 命星罐开奖！触发者获得 ${actualLegendShare} FS (评分:${cardScore})，共分配 ${distributed} FS` });
    if (globalEvents.length > 20) globalEvents.pop();
}

// ===== 管理员鉴权中间件 =====
async function adminAuth(req, res, next) {
    const secret = req.headers['x-admin-secret'] || req.body.adminSecret || req.query.secret;
    const config = await getConfig();
    if (secret !== config.adminSecret) {
        return res.status(403).json({ success: false, msg: '管理员密钥错误' });
    }
    next();
}

// ==========================================
// ===== 管理后台 API =====
// ==========================================

// 🚨 紧急重置密钥（不需要鉴权，调试完成后请删除此接口）
app.get('/admin/emergency-reset', async (req, res) => {
    try {
        const config = await updateConfig({ adminSecret: 'arcana-admin-2024' });
        clearConfigCache();
        console.log('🚨 紧急重置管理员密钥为: arcana-admin-2024');
        res.json({ success: true, msg: '密钥已重置为 arcana-admin-2024' });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// 获取当前所有配置
app.get('/admin/config', adminAuth, async (req, res) => {
    try {
        const config = await getConfig();
        res.json({ success: true, config });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// 更新配置（部分更新）
app.post('/admin/config', adminAuth, async (req, res) => {
    try {
        const { adminSecret, ...updates } = req.body;
        const config = await updateConfig(updates);
        console.log('📋 管理员更新配置:', Object.keys(updates).join(', '));
        res.json({ success: true, config, msg: '配置已更新' });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// 获取卡牌模板列表
app.get('/admin/cards', adminAuth, async (req, res) => {
    res.json({ success: true, templates: CARD_TEMPLATES });
});

// 热更新卡牌模板（运行时修改，不持久化到文件）
app.post('/admin/cards', adminAuth, async (req, res) => {
    try {
        const { type, cards } = req.body; // type: 'common'|'rare'|'hero'|'legend', cards: [{name,img,desc}]
        if (!type || !cards || !Array.isArray(cards)) {
            return res.json({ success: false, msg: '参数错误: 需要 type 和 cards[]' });
        }
        if (!CARD_TEMPLATES[type]) {
            return res.json({ success: false, msg: '无效类型: ' + type });
        }
        CARD_TEMPLATES[type] = cards;
        console.log(`📋 管理员更新 ${type} 卡牌模板: ${cards.length} 张`);
        res.json({ success: true, templates: CARD_TEMPLATES, msg: `${type} 模板已更新 (${cards.length}张)` });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// 查询所有用户概览
app.get('/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find({}).select('address fsBalance drawTickets stakedFs inventory referralCode');
        const summary = users.map(u => ({
            address: u.address,
            fsBalance: u.fsBalance,
            drawTickets: u.drawTickets,
            stakedFs: u.stakedFs,
            cardCount: u.inventory.length,
            legendCount: u.inventory.filter(c => c.type === 'legend').length,
            heroCount: u.inventory.filter(c => c.type === 'hero').length,
            rareCount: u.inventory.filter(c => c.type === 'rare').length,
            commonCount: u.inventory.filter(c => c.type === 'common').length,
            mintedCount: u.inventory.filter(c => c.minted).length,
        }));
        res.json({ success: true, count: users.length, users: summary });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// 修改指定用户资源
app.post('/admin/user/modify', adminAuth, async (req, res) => {
    try {
        const { address, fsBalance, drawTickets, stakedFs } = req.body;
        const user = await User.findOne({ address: address.toLowerCase() });
        if (!user) return res.json({ success: false, msg: '用户不存在' });
        if (fsBalance !== undefined) user.fsBalance = fsBalance;
        if (drawTickets !== undefined) user.drawTickets = drawTickets;
        if (stakedFs !== undefined) user.stakedFs = stakedFs;
        await user.save();
        res.json({ success: true, msg: `用户 ${address.slice(-4)} 已更新`, user: { address: user.address, fsBalance: user.fsBalance, drawTickets: user.drawTickets, stakedFs: user.stakedFs } });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// 给用户发卡（GM工具）
app.post('/admin/user/givecard', adminAuth, async (req, res) => {
    try {
        const { address, cardType, count } = req.body;
        const user = await User.findOne({ address: address.toLowerCase() });
        if (!user) return res.json({ success: false, msg: '用户不存在' });
        const num = count || 1;
        const cards = [];
        for (let i = 0; i < num; i++) {
            const card = await generateCard(cardType);
            user.inventory.push(card);
            cards.push(card);
        }
        await user.save();
        res.json({ success: true, msg: `已发放 ${num} 张 ${cardType} 卡`, cards });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// 全局统计
app.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        const [userCount, jar, pool] = await Promise.all([
            User.countDocuments(),
            getJar(),
            getStakePool(),
        ]);
        const allUsers = await User.find({});
        let totalCards = 0, totalFs = 0, totalStaked = 0;
        const cardsByType = { common: 0, rare: 0, hero: 0, legend: 0 };
        const mintedByType = { common: 0, rare: 0, hero: 0, legend: 0 };
        for (const u of allUsers) {
            totalFs += u.fsBalance;
            totalStaked += u.stakedFs;
            for (const c of u.inventory) {
                totalCards++;
                if (cardsByType[c.type] !== undefined) cardsByType[c.type]++;
                if (c.minted && mintedByType[c.type] !== undefined) mintedByType[c.type]++;
            }
        }
        res.json({
            success: true,
            stats: {
                userCount, totalCards, totalFs, totalStaked,
                cardsByType, mintedByType,
                jarFs: jar.totalFs, jarDrawCount: jar.drawHistory.length,
                stakePoolBnb: pool.totalBnbPool,
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// 修改管理员密钥
app.post('/admin/change-secret', adminAuth, async (req, res) => {
    try {
        const { newSecret } = req.body;
        if (!newSecret || newSecret.length < 6) return res.json({ success: false, msg: '密钥至少6位' });
        await updateConfig({ adminSecret: newSecret });
        res.json({ success: true, msg: '密钥已更新' });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
});

// ==========================================
// ===== 业务 API（使用动态配置） =====
// ==========================================

// 登录
app.post('/login', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) return res.status(400).json({ msg: "无地址" });
        const lowerAddr = address.toLowerCase();
        const config = await getConfig();
        
        let user = await User.findOne({ address: lowerAddr });
        if (!user) {
            user = new User({ address: lowerAddr, referralCode: address.slice(-6), inventory: [], fsBalance: config.newUserFs });
            
            // Invitation Logic
            if (req.body.refCode) {
                const referrer = await User.findOne({ referralCode: req.body.refCode });
                if (referrer && referrer.address !== lowerAddr) {
                    user.referrer = referrer.address;
                    referrer.referrals.push({
                        address: lowerAddr,
                        joinedAt: new Date(),
                        rewardClaimed: false
                    });
                    await referrer.save();
                }
            }

            // VIP账户
            const vip = config.vipAddresses?.find(v => v.address.toLowerCase() === lowerAddr);
            if (vip) user.fsBalance = vip.fsBalance;
            await user.save();
        } else {
            const vip = config.vipAddresses?.find(v => v.address.toLowerCase() === lowerAddr);
            if (vip && user.fsBalance < vip.fsBalance) { user.fsBalance = vip.fsBalance; }
            if (cleanInventory(user) || (vip && user.fsBalance <= vip.fsBalance)) { await user.save(); }
        }
        
        // 动态修复 inventory 图片
        const userObj = user.toObject();
        userObj.inventory = userObj.inventory.map(fixCardData);
        
        res.json({ success: true, user: userObj });
    } catch (e) {
        console.error('❌ 登录错误:', e.message);
        res.status(500).json({ success: false, msg: '服务器错误' });
    }
});

app.get('/events', (req, res) => { res.json(globalEvents); });

// 抽卡
app.post('/draw', async (req, res) => {
    try {
        const { address, amount, useTicket } = req.body;
        // 自动注册/获取用户逻辑
        if (!address) return res.status(400).json({ success: false, msg: "无地址" });
        
        const config = await getConfig();
        let user = await User.findOne({ address: address.toLowerCase() }); // 忽略大小写查找
        
        if (!user) {
            // 如果用户不存在，自动注册（类似于 /login）
            user = new User({ 
                address: address.toLowerCase(), 
                referralCode: address.slice(-6), 
                inventory: [], 
                fsBalance: config.newUserFs 
            });
            await user.save();
        }

        cleanInventory(user);

        let usedTicket = false;
        if (useTicket) {
            if (user.drawTickets >= amount) { user.drawTickets -= amount; usedTicket = true; }
            else return res.json({ success: false, msg: "占卜卷不足" });
        }

        if (!usedTicket) {
            const bnbSpent = amount * config.drawPrice;
            const revDist = config.revenueDistribution;
            const buybackFs = Math.floor(bnbSpent * (revDist.jarBuyback / 100) * config.fsPerUsd);
            const stakeBnb = bnbSpent * (revDist.stakePool / 100);

            const jar = await getJar();
            jar.totalFs += buybackFs;
            jar.totalBnbCollected += bnbSpent;
            await jar.save();

            const stakePool = await getStakePool();
            stakePool.totalBnbPool += stakeBnb;
            await stakePool.save();
        }

        let newCards = [];
        for (let i = 0; i < amount; i++) {
            const card = await generateCard();
            user.inventory.push(card);
            newCards.push(card);
            if (card.type === 'legend' || card.type === 'hero') {
                globalEvents.unshift({ type: card.type, msg: `🎉 ${address.slice(-4)} 抽出 [${card.name} #${card.uuid.slice(-4)}]` });
                if (globalEvents.length > 20) globalEvents.pop();
            }
        }
        await user.save();

        // 修复返回的数据
        const fixedDrawn = newCards.map(fixCardData);
        const fixedInventory = user.inventory.map(fixCardData);

        res.json({ success: true, drawn: fixedDrawn, inventory: fixedInventory, drawTickets: user.drawTickets, fsBalance: user.fsBalance, usedTicket });
    } catch (e) {
        console.error('❌ 抽卡错误:', e.message);
        res.status(500).json({ success: false, msg: '服务器错误: ' + e.message });
    }
});

// 评分
app.post('/rate', async (req, res) => {
    try {
        const { address, cardUuid, txHash } = req.body;
        if (!address) return res.json({ success: false, msg: "无地址" });
        const lowerAddr = address.toLowerCase();
        
        const user = await User.findOne({ address: lowerAddr });
        if (!user) return res.json({ success: false, msg: "用户不存在" });
        const config = await getConfig();

        const card = user.inventory.find(c => c.uuid === cardUuid);
        if (!card) return res.json({ success: false, msg: "未找到该卡牌" });
        if (card.minted) return res.json({ success: false, msg: "已铸造卡牌不可评分" });

        const rc = config.ratingCosts;
        let cost;
        if (card.rateCount === 0) cost = rc.first;
        else if (card.rateCount === 1) cost = rc.second;
        else cost = rc.base * Math.pow(2, card.rateCount - 2);

        if (!txHash) {
            if (user.fsBalance < cost) return res.json({ success: false, msg: `命星不足 (需${cost}, 现有${user.fsBalance})` });
            user.fsBalance -= cost;
        }
        
        card.rateCount += 1;

        const range = config.scoreRanges[card.type] || { min: 1, max: 100 };
        const newScore = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        card.score = newScore;
        card.ratingHistory.push(newScore);

        await user.save();
        
        const fixedCard = fixCardData(card);
        res.json({ success: true, card: fixedCard, fsBalance: user.fsBalance, msg: `评分完成！消耗${cost}FS，得分:${newScore} (第${card.rateCount}次)` });
    } catch (e) {
        console.error('❌ 评分错误:', e.message);
        res.status(500).json({ success: false, msg: '服务器错误: ' + e.message });
    }
});

// 销毁
app.post('/burn', async (req, res) => {
    try {
        const { address, cardUuids } = req.body;
        if (!address) return res.json({ success: false, msg: "无地址" });
        const lowerAddr = address.toLowerCase();
        
        const user = await User.findOne({ address: lowerAddr });
        if (!user) return res.json({ success: false, msg: "用户不存在" });
        const config = await getConfig();
        const bc = config.burnConfig;

        if (!cardUuids || cardUuids.length !== bc.required) return res.json({ success: false, msg: `必须选择${bc.required}张卡` });
        const targets = user.inventory.filter(c => cardUuids.includes(c.uuid));
        if (targets.length !== bc.required) return res.json({ success: false, msg: "卡牌不存在" });
        if (!targets.every(c => c.type === bc.fromType)) return res.json({ success: false, msg: `只能销毁${bc.fromType}卡` });

        user.inventory = user.inventory.filter(c => !cardUuids.includes(c.uuid));
        user.drawTickets += bc.rewardTickets;
        await user.save();
        
        const fixedInventory = user.inventory.map(fixCardData);
        res.json({ success: true, inventory: fixedInventory, drawTickets: user.drawTickets, fsBalance: user.fsBalance, msg: `销毁成功！+${bc.rewardTickets}占卜卷` });
    } catch (e) {
        console.error('❌ 销毁错误:', e.message);
        res.status(500).json({ success: false, msg: '服务器错误' });
    }
});

// 合成
app.post('/synthesize', async (req, res) => {
    try {
        const { address, targetType, cardUuids } = req.body;
        if (!address) return res.json({ success: false, msg: "无地址" });
        const lowerAddr = address.toLowerCase();
        
        const user = await User.findOne({ address: lowerAddr });
        if (!user) return res.json({ success: false, msg: "用户不存在" });
        const config = await getConfig();

        const recipe = config.synthRecipes[targetType];
        if (!recipe) return res.json({ success: false, msg: "无效合成目标" });

        if (!cardUuids || cardUuids.length !== recipe.need) return res.json({ success: false, msg: `需选择 ${recipe.need} 张卡` });
        const targets = user.inventory.filter(c => cardUuids.includes(c.uuid));
        if (targets.length !== recipe.need) return res.json({ success: false, msg: "卡牌验证失败" });
        if (!targets.every(c => c.type === recipe.from)) return res.json({ success: false, msg: "卡牌类型不符" });

        user.inventory = user.inventory.filter(c => !cardUuids.includes(c.uuid));
        const newCard = await generateCard(targetType);
        user.inventory.push(newCard);

        if (targetType !== 'rare') globalEvents.unshift({ type: targetType, msg: ` ${address.slice(-4)} 合成出 [${newCard.name} #${newCard.uuid.slice(-4)}]` });
        await user.save();

        const fixedInventory = user.inventory.map(fixCardData);
        res.json({ success: true, inventory: fixedInventory, fsBalance: user.fsBalance, msg: `合成成功！获得 ${newCard.name}` });
    } catch (e) {
        console.error('❌ 合成错误:', e.message);
        res.status(500).json({ success: false, msg: '服务器错误: ' + e.message });
    }
});

// 铸造NFT - 获取签名
app.post('/get-mint-signature', async (req, res) => {
    try {
        const { address, cardUuid } = req.body;
        if (!address || !cardUuid) return res.status(400).json({ success: false, msg: "Missing parameters" });
        const lowerAddr = address.toLowerCase();

        const user = await User.findOne({ address: lowerAddr });
        if (!user) return res.json({ success: false, msg: "用户不存在" });

        const card = user.inventory.find(c => c.uuid === cardUuid);
        if (!card) return res.json({ success: false, msg: "卡牌不存在" });
        if (card.minted) return res.json({ success: false, msg: "已铸造" });
        if (card.score <= 0) return res.json({ success: false, msg: "请先评分" });

        // 签名逻辑
        const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
        if (!signerPrivateKey) return res.status(500).json({ success: false, msg: "后端未配置签名私钥" });

        const wallet = new ethers.Wallet(signerPrivateKey);
        
        // 生成 nonce (可以使用时间戳或数据库计数器)
        const nonce = Math.floor(Date.now() / 1000); 
        
        // TokenID 生成: 使用数据库自增 ID
        let tokenId = card.tokenId;

        // 如果没有ID，或者ID太长(是旧的Hash格式 > 20位)，则生成新的自增ID
        if (!tokenId || tokenId.length > 20) {
             const counter = await Counter.findOneAndUpdate(
                 { name: 'tokenId' }, 
                 { $inc: { seq: 1 } }, 
                 { new: true, upsert: true }
             );
             
             tokenId = counter.seq.toString();
             card.tokenId = tokenId;
             await user.save();
        }

        // 确定 Tier ID (1=Legend, 2=Hero, 3=Rare, 4=Common)
        let tier = 4;
        if (card.type === 'legend') tier = 1;
        else if (card.type === 'hero') tier = 2;
        else if (card.type === 'rare') tier = 3;

        // Hashing: 必须与 Solidity 匹配: 
        // keccak256(abi.encodePacked(msg.sender, tokenId, tier, score, nonce))
        // 注意参数顺序：address, uint256, uint8, uint8, uint256
        const hash = ethers.solidityPackedKeccak256(
            ["address", "uint256", "uint8", "uint8", "uint256"],
            [address, tokenId, tier, card.score, nonce]
        );

        // 签名
        const signature = await wallet.signMessage(ethers.getBytes(hash));

        res.json({ success: true, signature, nonce, tokenId: tokenId.toString(), tier, score: card.score, msg: "签名已生成" });

    } catch (e) {
        console.error('❌ 签名生成错误:', e.message);
        res.status(500).json({ success: false, msg: '服务器错误: ' + e.message });
    }
});

// 铸造NFT - 确认 (旧接口，仅用于同步状态)
app.post('/mint', async (req, res) => {
    try {
        const { address, cardUuid } = req.body;
        if (!address) return res.json({ success: false, msg: "无地址" });
        const lowerAddr = address.toLowerCase();
        
        const user = await User.findOne({ address: lowerAddr });
        if (!user) return res.json({ success: false, msg: "用户不存在" });
        const card = user.inventory.find(c => c.uuid === cardUuid);
        if (!card) return res.json({ success: false, msg: "卡牌不存在" });
        if (card.minted) return res.json({ success: false, msg: "已铸造" });
        // if (card.score <= 0) return res.json({ success: false, msg: "请先评分" }); // 合约已检查，后端可放宽或保持一致

        card.minted = true;
        await user.save();
        if (card.type === 'legend') await triggerJarDraw(address, card.name, card.score);

        globalEvents.unshift({ type: card.type, msg: `⛓️ ${address.slice(-4)} 铸造了 [${card.name}] NFT!` });
        if (globalEvents.length > 20) globalEvents.pop();

        const fixedCard = fixCardData(card);
        const fixedInventory = user.inventory.map(fixCardData);
        
        res.json({ success: true, card: fixedCard, inventory: fixedInventory, fsBalance: user.fsBalance, msg: `铸造成功！${card.name} 已上链` });
    } catch (e) {
        console.error('❌ 铸造错误:', e.message);
        res.status(500).json({ success: false, msg: '服务器错误: ' + e.message });
    }
});

// ===== Metadata API (OpenSea 标准) =====
app.get('/api/metadata/:tokenId', async (req, res) => {
    try {
        const tokenId = req.params.tokenId;
        
        // 1. 在所有用户的所有卡牌中查找此 TokenID
        let card = null;
        const user = await User.findOne({ 'inventory.tokenId': tokenId });
        
        if (user) {
            card = user.inventory.find(c => c.tokenId === tokenId);
        }
        
        // 如果找不到 (比如你手动测)，给个默认值防止报错 (User Request)
        if (!card) { 
             console.log(`Metadata: Token ${tokenId} not found, using fallback.`);
             card = { 
                 name: "Death", 
                 filename: "Death.png", 
                 type: "common", 
                 score: 60, 
                 rateCount: 0 
             }; 
        }

        // 🔥 关键修复：确保 filename 存在 (使用 fixCardData 补全)
        card = fixCardData(card);

        // 确定 Tier ID
        let tierId = 4;
        if (card.type === 'legend') tierId = 1;
        else if (card.type === 'hero') tierId = 2;
        else if (card.type === 'rare') tierId = 3;
        else if (card.type === 'common') tierId = 4;
        // 如果 fallback 里的 type 不匹配，tierId 默认为 4

        const filename = card.filename || "The Fool.png";
        
        // 🔥 处理 URL 编码 (因为文件名里有空格)
        const safeFilename = encodeURIComponent(filename);
        const folderCid = RARITY_CIDS[tierId];
        
        if (!folderCid) {
            return res.status(500).json({ error: "Invalid Rarity CID Configuration" });
        }

        // 最终拼出来的链接
        const image = `${PINATA_GATEWAY}${folderCid}/${safeFilename}`;

        const metadata = {
            name: `${card.name} #${card.uuid}`, // 使用 UUID 作为显示编号
            description: `Arcana Verse Tarot Card - Tier ${tierId} (${card.type}). Score: ${card.score}`,
            image: image,
            attributes: [
                { trait_type: "Tier", value: tierId },
                { trait_type: "Score", value: card.score },
                { trait_type: "Rate Count", value: card.rateCount || 0 },
                { trait_type: "Minted", value: "True" },
                { trait_type: "UUID", value: card.uuid }, // 额外添加 UUID 属性
                { trait_type: "Token ID", value: tokenId } // 保留 Token ID 属性供参考
            ]
        };

        res.json(metadata);

    } catch (e) {
        console.error("Metadata Error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/jar', async (req, res) => { try { res.json({ success: true, jar: await getJar() }); } catch (e) { res.status(500).json({ success: false }); } });
app.get('/stakepool', async (req, res) => { try { res.json({ success: true, pool: await getStakePool() }); } catch (e) { res.status(500).json({ success: false }); } });

// 质押
app.post('/stake', async (req, res) => {
    try {
        const { address, amount } = req.body;
        if (!address) return res.json({ success: false, msg: "无地址" });
        const lowerAddr = address.toLowerCase();
        
        const user = await User.findOne({ address: lowerAddr });
        if (!user) return res.json({ success: false, msg: "用户不存在" });
        if (!amount || amount <= 0) return res.json({ success: false, msg: "数量无效" });
        if (user.fsBalance < amount) return res.json({ success: false, msg: `命星不足` });

        user.fsBalance -= amount;
        user.stakedFs += amount;
        user.stakedAt = new Date();
        await user.save();

        const pool = await getStakePool();
        pool.totalStaked += amount;
        await pool.save();
        res.json({ success: true, fsBalance: user.fsBalance, stakedFs: user.stakedFs, msg: `质押成功！已质押 ${amount} FS` });
    } catch (e) { res.status(500).json({ success: false, msg: '服务器错误' }); }
});

// 解质押
app.post('/unstake', async (req, res) => {
    try {
        const { address, amount } = req.body;
        if (!address) return res.json({ success: false, msg: "无地址" });
        const lowerAddr = address.toLowerCase();
        
        const user = await User.findOne({ address: lowerAddr });
        if (!user) return res.json({ success: false, msg: "用户不存在" });
        if (!amount || amount <= 0 || user.stakedFs < amount) return res.json({ success: false, msg: `质押不足` });
        const config = await getConfig();

        const feeRate = config.stakeConfig.unstakeFeeRate;
        const fee = Math.floor(amount * feeRate);
        const returned = amount - fee;

        user.stakedFs -= amount;
        user.fsBalance += returned;
        await user.save();

        const pool = await getStakePool();
        pool.totalStaked -= amount;
        await pool.save();

        if (config.stakeConfig.feeDestination === 'jar') {
            const jar = await getJar();
            jar.totalFs += fee;
            await jar.save();
        }
        res.json({ success: true, fsBalance: user.fsBalance, stakedFs: user.stakedFs, msg: `解押成功！返回 ${returned} FS（扣除${fee} FS）` });
    } catch (e) { res.status(500).json({ success: false, msg: '服务器错误' }); }
});

// 领取分红
app.post('/claim-stake-rewards', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) return res.json({ success: false, msg: "无地址" });
        const lowerAddr = address.toLowerCase();
        
        const user = await User.findOne({ address: lowerAddr });
        if (!user || user.stakedFs <= 0) return res.json({ success: false, msg: "无质押" });
        const config = await getConfig();
        const pool = await getStakePool();
        if (pool.totalBnbPool <= 0 || pool.totalStaked <= 0) return res.json({ success: false, msg: "暂无分红" });

        const share = (user.stakedFs / pool.totalStaked) * pool.totalBnbPool;
        const bnbReward = Math.floor(share * 100) / 100;
        user.stakeBnbRewards += bnbReward;
        user.fsBalance += Math.floor(bnbReward * config.fsPerUsd);
        await user.save();

        pool.totalBnbPool -= bnbReward;
        if (pool.totalBnbPool < 0) pool.totalBnbPool = 0;
        await pool.save();
        res.json({ success: true, fsBalance: user.fsBalance, stakedFs: user.stakedFs, bnbReward, msg: `领取成功！+${bnbReward} BNB` });
    } catch (e) { res.status(500).json({ success: false, msg: '服务器错误' }); }
});



// 邀请奖励领取
app.post('/invite/claim', async (req, res) => {
    const { address } = req.body;
    if (!address) return res.json({ success: false, msg: 'No address' });
    const lowerAddr = address.toLowerCase();

    try {
        const user = await User.findOne({ address: lowerAddr });
        if (!user) return res.json({ success: false, msg: 'User not found' });
        if (user.inviteRewardClaimed) return res.json({ success: false, msg: 'Reward already claimed' });

        // 1. Check Balance (RPC) - Require > 0.3 BNB
        const provider = new ethers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
        const balanceWei = await provider.getBalance(lowerAddr);
        const balance = parseFloat(ethers.formatEther(balanceWei));
        
        if (balance < 0.3) {
            return res.json({ success: false, msg: `余额不足 (${balance.toFixed(3)} < 0.3 BNB)` });
        }

        // 2. Check Transactions (BscScan) - > 12 txs in 3 days
        const threeDaysAgo = Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60);
        const apiKey = process.env.BSCSCAN_API_KEY || ""; 
        const url = `https://api-testnet.bscscan.com/api?module=account&action=txlist&address=${lowerAddr}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
        
        const txRes = await axios.get(url);
        const txs = Array.isArray(txRes.data.result) ? txRes.data.result : [];
        const recentTxs = txs.filter(tx => parseInt(tx.timeStamp) > threeDaysAgo);
        
        if (recentTxs.length <= 12) {
             return res.json({ success: false, msg: `近3天交易不足 (${recentTxs.length} <= 12)` });
        }

        // 3. Distribute Rewards (1 Ticket each)
        user.inviteRewardClaimed = true;
        user.drawTickets += 1;
        await user.save();

        let refMsg = "";
        if (user.referrer) {
            const referrer = await User.findOne({ address: user.referrer });
            if (referrer) {
                referrer.drawTickets += 1;
                const refEntry = referrer.referrals.find(r => r.address === lowerAddr);
                if (refEntry) refEntry.rewardClaimed = true;
                await referrer.save();
                refMsg = " + 邀请人已获奖励";
            }
        }

        res.json({ success: true, msg: '领取成功！获得1张占卜卷' + refMsg, balance, txCount: recentTxs.length });

    } catch (e) {
        console.error(e);
        res.json({ success: false, msg: 'Server Error: ' + e.message });
    }
});

// 前端拉取动态配置（公开部分，用于同步前端显示）
app.get('/public-config', async (req, res) => {
    try {
        const config = await getConfig();
        res.json({
            success: true,
            config: {
                drawPrice: config.drawPrice,
                drawCurrency: config.drawCurrency,
                treasuryAddress: config.treasuryAddress,
                synthRecipes: config.synthRecipes,
                burnConfig: config.burnConfig,
                jarDistribution: config.jarDistribution,
                stakeUnstakeFee: config.stakeConfig.unstakeFeeRate,
            }
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

// AI 读牌
app.post('/ai-read', async (req, res) => {
    try {
        const { cards, lang } = req.body;
        if (!cards || !Array.isArray(cards) || cards.length === 0) {
            return res.json({ success: false, msg: '没有卡牌' });
        }

        const isZh = lang === 'zh';
        const cardNames = cards.map(c => c.name).join(', ');
        
        const systemPrompt = isZh 
            ? "你是一位神秘的塔罗牌占卜师，擅长通过牌面揭示命运的启示。请根据用户抽到的塔罗牌，给出一段富有神秘感、启发性的解读。解读应包含对每张牌的简要分析以及整体的命运指引。语气要神秘、优雅、充满智慧。"
            : "You are a mysterious tarot reader, skilled in revealing the revelations of fate through the cards. Please provide a mysterious, inspiring interpretation based on the tarot cards drawn by the user. The interpretation should include a brief analysis of each card and overall guidance on fate. The tone should be mysterious, elegant, and wise.";

        const userPrompt = isZh
            ? `我抽到了以下塔罗牌：${cardNames}。请为我解读命运。`
            : `I drew the following tarot cards: ${cardNames}. Please interpret my fate.`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: process.env.AI_MODEL || "deepseek-chat",
        });

        const interpretation = completion.choices[0].message.content;

        res.json({ success: true, text: interpretation });
    } catch (e) {
        console.error('❌ AI 读牌错误:', e.message);
        // 降级处理：如果AI失败，返回基础解读
        const isZh = req.body.lang === 'zh';
        const fallback = isZh 
            ? "命运的迷雾暂时遮蔽了视线，但星辰依然在闪烁。请相信内心的指引。（AI服务暂时不可用）"
            : "The mist of fate temporarily obscures the view, but the stars are still twinkling. Trust your inner guidance. (AI service temporarily unavailable)";
        res.json({ success: true, text: fallback });
    }
});

app.listen(3001, async () => {
    console.log('✅ 后端已启动 :3001');
    // 初始化配置
    const config = await getConfig();
    // 如果数据库中密钥为空或丢失，重置为默认值
    if (!config.adminSecret) {
        await updateConfig({ adminSecret: 'arcana-admin-2024' });
        console.log('🔑 管理员密钥已重置为默认值');
    }
    // 强制修正测试网价格 (如果仍为旧默认值3)
    // Removed legacy check that forces 0.001
    /*
    if (config.drawPrice > 0.001) {
        await updateConfig({ drawPrice: 0.001 });
        console.log('💰 抽卡价格已修正为测试网默认值 0.001 BNB');
    }
    */
    console.log('🔑 当前管理员密钥:', config.adminSecret);
    // 清理脏数据
    try {
        const users = await User.find({});
        let cleaned = 0;
        for (const u of users) {
            const before = u.inventory.length;
            u.inventory = u.inventory.filter(c => c && c.uuid && c.type);
            if (before !== u.inventory.length) { await u.save(); cleaned++; }
        }
        console.log(cleaned > 0 ? `🧹 共清理 ${cleaned} 个用户` : '✅ 数据库干净');
    } catch (e) { console.log('⚠️ 启动清理跳过:', e.message); }
});