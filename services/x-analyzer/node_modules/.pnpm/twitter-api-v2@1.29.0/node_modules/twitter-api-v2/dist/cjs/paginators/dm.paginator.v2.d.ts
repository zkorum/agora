import { TimelineV2Paginator } from './v2.paginator';
import { DMEventV2, GetDMEventV2Params, GetDMEventV2Result } from '../types/v2/dm.v2.types';
export declare abstract class DMTimelineV2Paginator<TShared = any> extends TimelineV2Paginator<GetDMEventV2Result, GetDMEventV2Params, DMEventV2, TShared> {
    protected getItemArray(): DMEventV2[];
    /**
     * Events returned by paginator.
     */
    get events(): DMEventV2[];
    get meta(): import("../types/v2/shared.v2.types").PaginableCountMetaV2;
}
export declare class FullDMTimelineV2Paginator extends DMTimelineV2Paginator {
    protected _endpoint: string;
}
export declare class OneToOneDMTimelineV2Paginator extends DMTimelineV2Paginator<{
    participant_id: string;
}> {
    protected _endpoint: string;
}
export declare class ConversationDMTimelineV2Paginator extends DMTimelineV2Paginator<{
    dm_conversation_id: string;
}> {
    protected _endpoint: string;
}
