import {telegram, TUpdate} from "./Telegram";
import {db} from "./DB";

export class GroupHandler {
    public constructor(
        public readonly id: number
    ) {
        this.createGroup(id);
        telegram.onUpdate(this.onUpdate.bind(this));
    }

    private async createGroup(id: number) {
        await db.group.create({data: {id}});
        console.log(await db.group.findMany())
    }

    private async onUpdate(update: TUpdate) {
        const message = update.message;
        if (message) {
            const text = message.text;
            if (text !== undefined) {
                await telegram.sendMessage(message.chat.id, text);
            }
        }
    }

    public removeFromGroup() {

    }
}