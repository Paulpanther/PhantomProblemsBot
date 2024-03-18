import 'dotenv/config';

const token = process.env["TOKEN"];

interface TResponse<T> {
    ok: boolean;
    result?: T;
    error_code?: string;
    description?: string;
}

export interface TUpdate {
    update_id: number;
    message?: TMessage;
    poll_answer?: TPollAnswer;
    my_chat_member?: TChatMemberUpdated;
}

export interface TChatMemberUpdated {
    chat: TChat;
    from: TUser;
    date: number;
    old_chat_member: TChatMember;
    new_chat_member: TChatMember;
}

export interface TChatMember {
    status: 'left' | 'member';
    user: TUser;
}

export interface TMessage {
    message_id: number;
    from?: TUser;
    chat: TChat;
    date: number;
    text?: string;
}

export interface TMessageEntity {
    type: 'mention' | 'bot_command' | 'url' | 'bold' | 'italic' | 'strikethrough' | 'underline';
    offset: number;
    length: number;
    url?: string;
    user?: TUser;
}

export interface TUser {
    id: number;
    first_name: string;
    username?: string;
}

export interface TChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
}

export interface TPollAnswer {
    poll_id: string;
    voter_chat: TChat;
    user: TUser;
    option_ids: number[];
}

export interface TPoll {
    id: string;
    question: string;
    options: TPollOption[];
    total_voter_count: number;
}

export interface TPollOption {
    text: string;
    voter_count: number;
}

class Telegram {
    private static updateIntervalMillis = 1000;
    private lastUpdateId?: number;
    private callbacks: Array<(update: TUpdate) => Promise<void>> = [];
    private inUpdate = false;

    public constructor() {
        setInterval(async () => {
            if (this.inUpdate) return;
            this.inUpdate = true;

            try {
                const updates = await this.getUpdates(this.lastUpdateId ? this.lastUpdateId + 1 : undefined);
                if (updates.length === 0) return;

                this.lastUpdateId = updates[updates.length - 1].update_id;

                for (const update of updates) {
                    for (const callback of this.callbacks) {
                        await callback(update);
                    }
                }
            } finally {
                this.inUpdate = false;
            }
        }, Telegram.updateIntervalMillis);
    }

    public onUpdate(callback: (update: TUpdate) => Promise<void>) {
        this.callbacks.push(callback);
    }

    public async sendMessage(
        chat_id: number | string,
        text: string,
        entities?: TMessageEntity[]
    ): Promise<TMessage> {
         return await this.request('sendMessage', {
            chat_id,
            text,
            parse_mode: 'MarkdownV2',
            entities,
        });
    }

    public async sendPoll(
        chat_id: number | string,
        question: string,
        options: string[],
        is_anonymous?: boolean,
        allows_multiple_answers?: boolean,
        open_period?: number,
        close_date?: number,
    ): Promise<TMessage> {
        return await this.request('sendPoll', {
            chat_id,
            question,
            options,
            is_anonymous,
            allows_multiple_answers,
            open_period,
            close_date
        });
    }

    public async getUpdates(offset?: number, limit?: number) {
        return await this.request<TUpdate[]>('getUpdates', {offset, limit});
    }

    /**
     * Sends a request to the telegram api, returns the response,
     * or throws an error if either a network error or incorrect api usage occurred
     *
     * @param method The method of the telegram api
     * @param params Object with keys and values (values will be serialized via JSON.stringify
     */
    private async request<T>(method: string, params: Record<string, any>): Promise<T> {
        const body =
            Object.fromEntries(Object.entries(params)
                .filter(([key, value]) => value));
        const url = `https://api.telegram.org/bot${token}/${method}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await res.json() as TResponse<T>;
        // console.log(`${url}\n--> ${JSON.stringify(body)}\n<-- ${JSON.stringify(data)}`);

        if (data.ok) {
            return data.result!;
        } else {
            throw new Error(`Telegram Error ${data.error_code} in request to method ${method}: ${data.description}`);
        }
    }
}

export const telegram = new Telegram();