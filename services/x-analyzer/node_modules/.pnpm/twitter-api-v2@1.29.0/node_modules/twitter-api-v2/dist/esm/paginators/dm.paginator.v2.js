import { TimelineV2Paginator } from './v2.paginator';
export class DMTimelineV2Paginator extends TimelineV2Paginator {
    getItemArray() {
        return this.events;
    }
    /**
     * Events returned by paginator.
     */
    get events() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
    }
    get meta() {
        return super.meta;
    }
}
export class FullDMTimelineV2Paginator extends DMTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'dm_events';
    }
}
export class OneToOneDMTimelineV2Paginator extends DMTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'dm_conversations/with/:participant_id/dm_events';
    }
}
export class ConversationDMTimelineV2Paginator extends DMTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'dm_conversations/:dm_conversation_id/dm_events';
    }
}
