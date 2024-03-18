import {telegram, TUpdate} from "./telegram";
import {GroupHandler} from "./group_handler";
import {db} from "./db";

export class App {
    // Bot supports multiple groups at once
    private groups: GroupHandler[] = [];

    public constructor() {
        this.init();
    }

    private async init() {
        // load groups from db
        await this.initGroups();
        // register commands
        await this.initCommands();

        telegram.onUpdate(this.onUpdate.bind(this));
    }

    private async onUpdate(update: TUpdate) {
        // myChatMember is send when bot is added/removed from group
        if (update.my_chat_member) {
            const status = update.my_chat_member.new_chat_member.status;
            const id = update.my_chat_member.chat.id;
            const existingGroup = this.groups.find(c => c.id === id);

            if (status === 'member' && !existingGroup) {
                // Add to db
                await db.group.create({data: {id}});
                // Add handler
                this.groups.push(new GroupHandler(id));

                console.log('Added bot to chat ' + update.my_chat_member.chat.title);
            } else if (status === 'left' && existingGroup) {
                // Delete from db
                await db.group.delete({where: {id}})
                // Remove handler
                existingGroup.destroy();
                this.groups.splice(this.groups.indexOf(existingGroup), 1);

                console.log('Removed bot from chat ' + update.my_chat_member.chat.title);
            }
        }
    }

    private async initGroups() {
        const groups = await db.group.findMany();
        for (const group of groups) {
            this.groups.push(new GroupHandler(Number(group.id)));
        }
    }

    private async initCommands() {
        await telegram.setMyCommands([
            {
                command: 'polltime',
                description: 'Set time for weekly poll with format: "<DayOfWeek> <Hour>:<Minutes>", example: "0 13:02" (sunday)'
            },
            {
                command: 'pollquestion',
                description: 'Override default question text for attendance poll'
            }
        ])
    }
}