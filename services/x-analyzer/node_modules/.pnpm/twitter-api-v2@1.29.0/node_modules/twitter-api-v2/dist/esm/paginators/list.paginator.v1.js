import { CursoredV1Paginator } from './paginator.v1';
class ListListsV1Paginator extends CursoredV1Paginator {
    refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
            this._realData.lists.push(...result.lists);
            this._realData.next_cursor = result.next_cursor;
        }
    }
    getPageLengthFromRequest(result) {
        return result.data.lists.length;
    }
    getItemArray() {
        return this.lists;
    }
    /**
     * Lists returned by paginator.
     */
    get lists() {
        return this._realData.lists;
    }
}
export class ListMembershipsV1Paginator extends ListListsV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/memberships.json';
    }
}
export class ListOwnershipsV1Paginator extends ListListsV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/ownerships.json';
    }
}
export class ListSubscriptionsV1Paginator extends ListListsV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/subscriptions.json';
    }
}
class ListUsersV1Paginator extends CursoredV1Paginator {
    refreshInstanceFromResult(response, isNextPage) {
        const result = response.data;
        this._rateLimit = response.rateLimit;
        if (isNextPage) {
            this._realData.users.push(...result.users);
            this._realData.next_cursor = result.next_cursor;
        }
    }
    getPageLengthFromRequest(result) {
        return result.data.users.length;
    }
    getItemArray() {
        return this.users;
    }
    /**
     * Users returned by paginator.
     */
    get users() {
        return this._realData.users;
    }
}
export class ListMembersV1Paginator extends ListUsersV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/members.json';
    }
}
export class ListSubscribersV1Paginator extends ListUsersV1Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/subscribers.json';
    }
}
