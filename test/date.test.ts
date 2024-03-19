import {GroupHandler} from '../src/group_handler';

test('GroupHandler.nextPollTime', () => {
    expect(GroupHandler.nextPollTime('0 16:03', new Date('2024-01-21T14:12:10.666+01:00'))?.date?.toString())
        .toStrictEqual(new Date('2024-01-21T16:03:00.000+01:00').toString());

    expect(GroupHandler.nextPollTime('1 02:03', new Date('2024-01-30T14:12:10.666+01:00'))?.date)
        .toStrictEqual(new Date('2024-02-05T02:03:00.000+01:00'));
});