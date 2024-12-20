import {Bot, Context, Keyboard} from "grammy";
import * as dotenv from "dotenv";
import path from "node:path";
import {readFile, writeFile} from "node:fs/promises";
import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {asyncQueueHandler} from "./helpers/async-queue-handler.js";
import {logger} from "./helpers/logger.js";

dotenv.config();

interface DB {
    [userId: string]: {
        requestsCount: number;
        userData: unknown;
    }
}

const USER_REQUESTS_BEFORE_ADVANCED = 15;
const EASY_WORD_BTN_TEXT = '👌Простое слово';
const ADVANCED_WORD_BTN_TEXT = '🔥Сложное слово';
const RANDOM_WORD_BTN_TEXT = '🎲Случайное слово';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const dbPath = path.join(__dirname, 'user_db.json');

if (!existsSync(dbPath)) writeFileSync(dbPath, JSON.stringify({}), 'utf-8');

const getDB = async (): Promise<DB> => {
    try {
        const data = await readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        logger.logError(err as Error);
        return {};
    }
}

const setDB = async (db: DB) => {
    try {
        await writeFile(dbPath, JSON.stringify(db, null, 2));
    } catch (err) {
        logger.logError(err as Error);
    }
}

async function updateUserAndRespond(ctx: Context, userId: string, db: DB) {
    const user = db[userId ?? ''];
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
} catch (err) {
    logger.logError(err as Error);
    process.exit(1);
}

const bot = new Bot(process.env.TOKEN!);

bot.command('start', async (ctx: Context) => {
    const userId = ctx.from?.id.toString() ?? '';
    const db = await getDB();

    if (!db[userId]) {
        db[userId] = {requestsCount: 0, userData: ctx.from};
        await setDB(db);
    }

    const keyboard = new Keyboard().text(EASY_WORD_BTN_TEXT);

    await ctx.reply('Нажми, чтобы получить случайное слово⬇️', {reply_markup: keyboard});
});

bot.on('message:text', async (ctx) => {
        asyncQueueHandler.enqueue(async () => {
            const userId = ctx.from?.id.toString() ?? "";
            const db = await getDB();

            if (db[userId]) db[userId].requestsCount += 1;
            else db[userId] = {requestsCount: 1, userData: ctx.from};

            await updateUserAndRespond(ctx, userId, db);
            await setDB(db);
        })
    }
);

bot.catch((err) => {
    logger.logError(err);
});

bot.start()
logger.logAppRestart()
