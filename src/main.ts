import {Bot, InlineKeyboard} from "grammy";
import * as dotenv from "dotenv";
import {readFile} from "node:fs/promises";

dotenv.config();

let easyWords: string[];
try {
    const content = await readFile("./src/easy-words.txt", "utf-8")
    easyWords = content.split("\n")
} catch (error) {
    console.error(error);
    process.exit(1);
}

const bot = new Bot(process.env.TOKEN!);

const getRandomWord = () => easyWords[Math.floor(Math.random() * easyWords.length)];

bot.command('start', (ctx) => {
    const inlineKeyboard = new InlineKeyboard()
        .text('Простое слово', 'easy_word')

    ctx.reply('Добро пожаловать, сымпровизируй-ка это:', {
        reply_markup: inlineKeyboard,
    });
});

bot.callbackQuery('easy_word', (ctx) => {
    ctx.answerCallbackQuery(getRandomWord());
});

bot.start();