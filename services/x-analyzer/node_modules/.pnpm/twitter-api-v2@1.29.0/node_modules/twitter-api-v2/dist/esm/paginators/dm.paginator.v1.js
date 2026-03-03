import { CursoredV1Paginator } from './paginator.v1';
export class DmEventsV1Paginator extends CursoredV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'direct_messages/events/list.json';
    }
    refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
            this._realData.events.push(...result.events);
            this._realData.next_cursor = result.next_cursor;
        }
    }
    getPageLengthFromRequest(result) {
        return result.data.events.length;
    }
    getItemArray() {
        return this.events;
    }
    /**
     * Events returned by paginator.
     */
    get events() {
        return this._realData.events;
    }
}
export class WelcomeDmV1Paginator extends CursoredV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'direct_messages/welcome_messages/list.json';
    }
    refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
            this._realData.welcome_messages.push(...result.welcome_messages);
            this._realData.next_cursor = result.next_cursor;
        }
    }
    getPageLengthFromRequest(result) {
        return result.data.welcome_messages.length;
    }
    getItemArray() {
        return this.welcomeMessages;
    }
    get welcomeMessages() {
        return this._realData.welcome_messages;
    }
}
