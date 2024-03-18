import {telegram, TUpdate} from "./Telegram";

export class ChatHandler {
    public constructor() {
        telegram.onUpdate(this.onUpdate.bind(this));
    }

    private async onUpdate(update: TUpdate) {
        const message = update.message;
        if (message) {
            const text = message.text;
            await telegram.sendMessage(message.chat.id, text);
        }
    }
}