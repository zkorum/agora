import TwitterPaginator from './TwitterPaginator';
export class CursoredV1Paginator extends TwitterPaginator {
    getNextQueryParams(maxResults) {
        var _a;
        return {
            ...this._queryParams,
            cursor: (_a = this._realData.next_cursor_str) !== null && _a !== void 0 ? _a : this._realData.next_cursor,
            ...(maxResults ? { count: maxResults } : {}),
        };
    }
    isFetchLastOver(result) {
        // If we cant fetch next page
        return !this.canFetchNextPage(result.data);
    }
    canFetchNextPage(result) {
        // If one of cursor is valid
        return !this.isNextCursorInvalid(result.next_cursor) || !this.isNextCursorInvalid(result.next_cursor_str);
    }
    isNextCursorInvalid(value) {
        return value === undefined
            || value === 0
            || value === -1
            || value === '0'
            || value === '-1';
    }
}
