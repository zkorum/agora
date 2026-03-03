import { CursoredV1Paginator } from './paginator.v1';
import type { UserFollowerIdsV1Params, UserFollowerIdsV1Result, UserFollowerListV1Params, UserFollowerListV1Result, TwitterResponse, UserV1 } from '../types';
export declare class UserFollowerListV1Paginator extends CursoredV1Paginator<UserFollowerListV1Result, UserFollowerListV1Params, UserV1> {
    protected _endpoint: string;
    protected refreshInstanceFromResult(response: TwitterResponse<UserFollowerListV1Result>, isNextPage: true): void;
    protected getPageLengthFromRequest(result: TwitterResponse<UserFollowerListV1Result>): number;
    protected getItemArray(): UserV1[];
    /**
     * Users returned by paginator.
     */
    get users(): UserV1[];
}
export declare class UserFollowerIdsV1Paginator extends CursoredV1Paginator<UserFollowerIdsV1Result, UserFollowerIdsV1Params, string> {
    protected _endpoint: string;
    protected _maxResultsWhenFetchLast: number;
    protected refreshInstanceFromResult(response: TwitterResponse<UserFollowerIdsV1Result>, isNextPage: true): void;
    protected getPageLengthFromRequest(result: TwitterResponse<UserFollowerIdsV1Result>): number;
    protected getItemArray(): string[];
    /**
     * Users IDs returned by paginator.
     */
    get ids(): string[];
}
