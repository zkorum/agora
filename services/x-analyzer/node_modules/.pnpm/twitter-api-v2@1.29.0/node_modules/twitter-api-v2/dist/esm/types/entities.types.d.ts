export interface Entity {
    start: number;
    end: number;
}
export interface UrlEntity extends Entity {
    url: string;
    expanded_url: string;
    display_url: string;
}
export interface HashtagEntity extends Entity {
    tag: string;
}
export interface CashtagEntity extends Entity {
    tag: string;
}
export interface MentionEntity extends Entity {
    username: string;
}
