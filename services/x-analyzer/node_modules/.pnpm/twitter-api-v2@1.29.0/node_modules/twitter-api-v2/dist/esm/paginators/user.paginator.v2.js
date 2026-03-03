import { TimelineV2Paginator } from './v2.paginator';
/** A generic PreviousableTwitterPaginator able to consume UserV2 timelines. */
class UserTimelineV2Paginator extends TimelineV2Paginator {
    getItemArray() {
        return this.users;
    }
    /**
     * Users returned by paginator.
     */
    get users() {
        var _a;
        return (_a = this._realData.data) !== null && _a !== void 0 ? _a : [];
    }
    get meta() {
        return super.meta;
    }
}
export class UserBlockingUsersV2Paginator extends UserTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/blocking';
    }
}
export class UserMutingUsersV2Paginator extends UserTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/muting';
    }
}
export class UserFollowersV2Paginator extends UserTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/followers';
    }
}
export class UserFollowingV2Paginator extends UserTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'users/:id/following';
    }
}
export class UserListMembersV2Paginator extends UserTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/:id/members';
    }
}
export class UserListFollowersV2Paginator extends UserTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'lists/:id/followers';
    }
}
export class TweetLikingUsersV2Paginator extends UserTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'tweets/:id/liking_users';
    }
}
export class TweetRetweetersUsersV2Paginator extends UserTimelineV2Paginator {
    constructor() {
        super(...arguments);
        this._endpoint = 'tweets/:id/retweeted_by';
    }
}
