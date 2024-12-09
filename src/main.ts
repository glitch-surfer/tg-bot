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
    const reply = btnText === EASY_WORD_BTN_TEXT ? getRandomWord() : getRandomWord()//hard word here;

    if (!isAdvancedUser) return ctx.reply(reply);

    const keyboard = new Keyboard()
        .text(EASY_WORD_BTN_TEXT)
        .text(ADVANCED_WORD_BTN_TEXT);

    await ctx.reply(reply, {reply_markup: keyboard});
}

let easyWords: string[];
const getRandomWord = () => easyWords[Math.floor(Math.random() * easyWords.length)];

try {
    const content = readFileSync("./src/easy-words.txt", "utf-8")
    easyWords = content.split("\n")
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

    await ctx.reply('Сымпровизируй-ка это:', {reply_markup: keyboard});
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

process.on('SIGINT', async () => {
    console.log('Saving DB before shutdown...');
    await saveDB();
    process.exit();
});

process.on('SIGTERM', async () => {
    console.log('Saving DB before shutdown...');
    await saveDB();
    process.exit();
});