import {Bot} from "grammy";
import * as dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.TOKEN!);

const randomWords = ["random word 1", "random word 2", "random word 3", "random word 4", "random word 5"];
const getRandomWord = () => randomWords[Math.floor(Math.random() * randomWords.length)];

bot.on("message", (ctx) => ctx.reply(getRandomWord()));

bot.start();