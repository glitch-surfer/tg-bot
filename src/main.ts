import {Bot, Context, Keyboard} from "grammy";
import * as dotenv from "dotenv";
import path from "node:path";
import {readFileSync} from "fs";
import {existsSync, writeFileSync} from "node:fs";

dotenv.config();

const USER_REQUESTS_BEFORE_ADVANCED = 15;
const EASY_WORD_BTN_TEXT = '👌Простое слово';
const ADVANCED_WORD_BTN_TEXT = '🔥Сложное слово';
const RANDOM_WORD_BTN_TEXT = '🎲Случайное слово';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const dbPath = path.join(__dirname, 'user_db.json');

let inMemoryDB: Record<string, { requestsCount: number, userData: unknown }> = {};
let isThereSomethingToSave = false;

function loadDB() {
    try {
        const data = readFileSync(dbPath, 'utf-8');
        inMemoryDB = JSON.parse(data);
    } catch (error) {
        console.error('Failed to load database:', error);
        inMemoryDB = {};
    }
}

function saveDB() {
    if (!isThereSomethingToSave) return;

    try {
        writeFileSync(dbPath, JSON.stringify(inMemoryDB, null, 2));
        isThereSomethingToSave = false;
    } catch (error) {
        console.error('Failed to save database:', error);
    }
}

if (!existsSync(dbPath)) {
    saveDB();
}

// Initial load of the database into memory
loadDB();

// Set an interval for batch saving to disk every 1 hour
setInterval(saveDB, 1000 * 60 * 60);

async function updateUserAndRespond(ctx: Context, userId?: string) {
    const user = inMemoryDB[userId ?? ''];
    const isAdvancedUser = user?.requestsCount >= USER_REQUESTS_BEFORE_ADVANCED;
    const btnText = ctx.message?.text ?? '';
    const isRandomBtn = btnText === RANDOM_WORD_BTN_TEXT;
    let reply: string;

    if (isRandomBtn) reply = Math.random() > 0.5 ? getRandomEasyWord() : getRandomHardWord();
    else reply = btnText === EASY_WORD_BTN_TEXT ? getRandomEasyWord() : getRandomHardWord()

    if (!isAdvancedUser) return ctx.reply(reply);

    const keyboard = new Keyboard()
        .text(EASY_WORD_BTN_TEXT)
        .text(ADVANCED_WORD_BTN_TEXT)
        .row()
        .text(RANDOM_WORD_BTN_TEXT);

    await ctx.reply(reply, {reply_markup: keyboard});
}

let easyWords: string[];
let hardWords: string[];
const getRandomEasyWord = () => easyWords[Math.floor(Math.random() * easyWords.length)];
const getRandomHardWord = () => hardWords[Math.floor(Math.random() * hardWords.length)];

try {
    easyWords = readFileSync("./src/easy-words.txt", "utf-8").split("\n")
    hardWords = readFileSync("./src/hard-words.txt", "utf-8").split("\n")
} catch (error) {
    console.error(error);
    process.exit(1);
}

const bot = new Bot(process.env.TOKEN!);

bot.command('start', async (ctx: Context) => {
    const userId = ctx.from?.id.toString() ?? '';

    if (!inMemoryDB[userId]) {
        isThereSomethingToSave = true;
        inMemoryDB[userId] = {requestsCount: 0, userData: ctx.from};
    }

    const keyboard = new Keyboard().text(EASY_WORD_BTN_TEXT);

    await ctx.reply('Нажми, чтобы получить случайное слово⬇️', {reply_markup: keyboard});
});

bot.on('message:text', async (ctx) => {
    isThereSomethingToSave = true;
    const userId = ctx.from?.id.toString() ?? "";

    if (inMemoryDB[userId]) {
        inMemoryDB[userId].requestsCount += 1;
        await updateUserAndRespond(ctx, userId);
    } else {
        await ctx.reply('Something went wrong.');
    }
});

bot.start();

process.on('SIGINT', () => {
    console.log('Saving DB before shutdown...');
    saveDB();
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('Saving DB before shutdown...');
    saveDB();
    process.exit();
});