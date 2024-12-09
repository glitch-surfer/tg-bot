import {Bot, Context, InlineKeyboard} from "grammy";
import * as dotenv from "dotenv";
import path from "node:path";
import {readFileSync} from "fs";
import {existsSync, writeFileSync} from "node:fs";

dotenv.config();

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const dbPath = path.join(__dirname, 'user_db.json');
let inMemoryDB: Record<string, { count: number }> = {};

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

// Set an interval for batch saving to disk every 10 minutes
setInterval(saveDB, 1000 * 60 * 10);

async function updateUserAndRespond(ctx: Context, userId?: string) {
    const user = inMemoryDB[userId ?? ''];

    let inlineKeyboard = new InlineKeyboard();

    if (user?.count < 15) {
        inlineKeyboard.text('👌Простое слово', 'easyWord');
    } else {
        inlineKeyboard.text('👌Простое слово', 'easyWord');
        inlineKeyboard.text('🔥Сложное слово', 'hardWord');
    }

    await ctx.reply(getRandomWord(), {reply_markup: inlineKeyboard});
}

let easyWords: string[];
try {
    const content = readFileSync("./src/easy-words.txt", "utf-8")
    easyWords = content.split("\n")
} catch (error) {
    console.error(error);
    process.exit(1);
}

const bot = new Bot('7620292223:AAHZ9vvoVvs9BI4ugWpxy9LGbE7GpNNZ7mA');

const getRandomWord = () => easyWords[Math.floor(Math.random() * easyWords.length)];

bot.command('start', async (ctx: Context) => {
    const userId = ctx.from?.id.toString() ?? '';

    if (!inMemoryDB[userId]) {
        inMemoryDB[userId] = {count: 0};
    }

    const inlineKeyboard = new InlineKeyboard().text('👌Простое слово', 'easyWord');

    await ctx.reply('Сымпровизируй-ка это:', {reply_markup: inlineKeyboard});
});

bot.callbackQuery('easyWord', async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id.toString() ?? "";

    if (inMemoryDB[userId]) {
        inMemoryDB[userId].count += 1;
        await updateUserAndRespond(ctx, userId);
    } else {
        await ctx.reply('Something went wrong.');
    }
});

bot.callbackQuery('hardWord', async (ctx) => {
    await ctx.answerCallbackQuery();
    await updateUserAndRespond(ctx);
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