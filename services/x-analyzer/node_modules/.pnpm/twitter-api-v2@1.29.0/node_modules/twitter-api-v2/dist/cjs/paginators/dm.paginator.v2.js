"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationDMTimelineV2Paginator = exports.OneToOneDMTimelineV2Paginator = exports.FullDMTimelineV2Paginator = exports.DMTimelineV2Paginator = void 0;
const v2_paginator_1 = require("./v2.paginator");
class DMTimelineV2Paginator extends v2_paginator_1.TimelineV2Paginator {
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
exports.DMTimelineV2Paginator = DMTimelineV2Paginator;
class FullDMTimelineV2Paginator extends DMTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'dm_events';
    }
}
exports.FullDMTimelineV2Paginator = FullDMTimelineV2Paginator;
class OneToOneDMTimelineV2Paginator extends DMTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'dm_conversations/with/:participant_id/dm_events';
    }
}
exports.OneToOneDMTimelineV2Paginator = OneToOneDMTimelineV2Paginator;
class ConversationDMTimelineV2Paginator extends DMTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'dm_conversations/:dm_conversation_id/dm_events';
    }
}
exports.ConversationDMTimelineV2Paginator = ConversationDMTimelineV2Paginator;
