import {promises as fsPromises} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

class Logger {
    private logFilePath: string;

    constructor(logFileName: string = 'app.log') {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        this.logFilePath = path.join(__dirname, logFileName);
    }

    /**
     * Writes a message to the log file with a timestamp.
     * @param message The message to log.
     */
    private async writeLog(message: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        try {
            await fsPromises.appendFile(this.logFilePath, logMessage, 'utf8');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Logs an error message.
     * @param error The error to log.
     */
    async logError(error: Error): Promise<void> {
        await this.writeLog(`ERROR: ${error.message}\nStack: ${error.stack}`);
    }

    /**
     * Logs an application restart message.
     */
    async logAppRestart(): Promise<void> {
        await this.writeLog('APPLICATION RESTARTED');
    }
}

export const logger = new Logger();