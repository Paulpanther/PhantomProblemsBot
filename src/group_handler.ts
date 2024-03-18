import {Telegram, telegram, TMessage, TUpdate, TUpdateListener} from './telegram';
import {db} from './db';
import {Group} from '@prisma/client';

export class GroupHandler {
    private readonly callback: TUpdateListener;
    private timeout?: NodeJS.Timeout;

    public constructor(
        public readonly id: number
    ) {
        this.callback = telegram.onUpdate(this.onUpdate.bind(this));
        // Init on app start to set timout from db stored pollTime
        this.updatePollTimeout();
    }

    private async onUpdate(update: TUpdate) {
        const message = update.message;
        if (!message) return;

        await this.handleCommands(message);
    }

    private async handleCommands(message: TMessage) {
        const command = message.entities?.find(e => e.type === 'bot_command');
        if (!command || !message.text) return;

        const commandText = Telegram.commandText(message.text, command);
        const payload = Telegram.textAfterCommand(message.text, command);

        switch (commandText) {
        case 'polltime': return this.commandPollTime(payload);
        case 'pollquestion': return this.commandPollQuestion(payload);
        }
    }

    private async commandPollTime(value: string) {
        if (value.trim().length === 0) {
            await telegram.sendMessage(this.id, (await this.dbGroup()).pollTime ?? 'no current poll time');
            return;
        }

        // try to get next poll time, but only to check if user input is valid
        const result = GroupHandler.nextPollTime(value, new Date());
        if (!result) {
            await telegram.sendMessage(this.id, 'Invalid format. Use: "<DayOfWeek> <Hour>:<Minutes>", example: "0 13:02" (sunday)');
            return;
        }

        await db.group.update({
            where: {id: this.id},
            data: {
                pollTime: result.pollTime,
            }
        });
        await this.updatePollTimeout();
        await telegram.sendMessage(this.id, `Set poll time. Next poll at ${result.date.toLocaleDateString('de-DE')} ${result.date.toLocaleTimeString('de-DE')}`);
    }

    public static nextPollTime(value: string, now: Date): {date: Date, pollTime: string} | undefined {
        try {
            const v = value.trim();
            const day = parseInt(v.split(' ')[0]);
            if (day < 0 || day > 6) return undefined;

            const time = v.split(' ')[1].split(':');
            const hour = parseInt(time[0]);
            const minutes = parseInt(time[1]);

            const currentDay = now.getDay();

            const currentTimeOfDay = ((now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
            // Midnight (start of current day)
            const date = new Date(now.getTime() - currentTimeOfDay);

            // Start of week
            date.setDate(date.getDate() - currentDay);

            // Day of week for poll
            date.setDate(date.getDate() + day);

            // Poll date
            date.setHours(hour + 1, minutes);

            if (date < now) {
                // If date is in the past, push one week into future
                date.setDate(date.getDate() + 7);
            }

            return {
                date,
                pollTime: `${day} ${hour}:${minutes}`
            };
        } catch (e) {
            return undefined;
        }
    }

    private async commandPollQuestion(value: string) {
        if (value.trim().length === 0) {
            await telegram.sendMessage(this.id, (await this.dbGroup()).pollQuestion);
            return;
        }

        db.group.update({
            where: {id: this.id},
            data: {
                pollQuestion: value
            }
        });
    }

    // reset the timout to the poll time from the db
    private async updatePollTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = undefined;

        const pollTime = (await this.dbGroup()).pollTime;
        if (!pollTime) return;

        const nextPoll = GroupHandler.nextPollTime(pollTime, new Date())?.date;
        if (!nextPoll) return;
        const waitTime = nextPoll.getTime() - Date.now();

        this.timeout = setTimeout(this.sendPoll.bind(this), waitTime);
    }

    private async sendPoll() {
        const question = (await this.dbGroup()).pollQuestion;
        await telegram.sendPoll(this.id, question, ['Yes', 'Maybe', 'No'], false, false);
    }

    private async dbGroup(): Promise<Group> {
        const group = await db.group.findFirst({where: {id: this.id}});
        if (!group) throw new Error(`Could not find group with id ${this.id} in db`);
        return group;
    }

    public destroy() {
        telegram.removeUpdateCallback(this.callback);
    }
}