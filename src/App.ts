import {telegram, TUpdate} from "./Telegram";
import {GroupHandler} from "./GroupHandler";
import {db} from "./DB";

export class App {
    private groups: GroupHandler[] = [];

    public constructor() {
        this.initGroups();
        telegram.onUpdate(this.onUpdate.bind(this));
    }

    private async onUpdate(update: TUpdate) {
        if (update.my_chat_member) {
            const status = update.my_chat_member.new_chat_member.status;
            const id = update.my_chat_member.chat.id;
            const existingGroup = this.groups.find(c => c.id === id);

            if (status === 'member' && !existingGroup) {
                this.groups.push(new GroupHandler(id));
                console.log('Added bot to chat ' + update.my_chat_member.chat.title);
            } else if (status === 'left' && existingGroup) {
                console.log('Removed bot from chat ' + update.my_chat_member.chat.title);
                existingGroup.removeFromGroup();
                this.groups.splice(this.groups.indexOf(existingGroup), 1);
            }
        }
    }

    private async initGroups() {
        const groups = await db.group.findMany();
        for (const group of groups) {
            this.groups.push(new GroupHandler(group.id));
        }
    }
}