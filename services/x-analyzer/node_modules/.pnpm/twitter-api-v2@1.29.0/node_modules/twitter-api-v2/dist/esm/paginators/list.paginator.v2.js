import { TimelineV2Paginator } from './v2.paginator';
class ListTimelineV2Paginator extends TimelineV2Paginator {
    getItemArray() {
        return this.lists;
    }
    /**
     * Lists returned by paginator.
     */
    get lists() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
    }
    get meta() {
        return super.meta;
    }
}
export class UserOwnedListsV2Paginator extends ListTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/owned_lists';
    }
}
export class UserListMembershipsV2Paginator extends ListTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/list_memberships';
    }
}
export class UserListFollowedV2Paginator extends ListTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/followed_lists';
    }
}
