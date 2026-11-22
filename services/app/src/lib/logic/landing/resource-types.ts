export const resourceTypes = ["vision", "case-study", "guide", "tech"] as const;
export type ResourceType = (typeof resourceTypes)[number];

export interface ResourcePostMeta {
  readonly slug: string;
  readonly type: ResourceType;
  readonly title: string;
  readonly description: string;
  readonly author: string;
  readonly date: Date;
  readonly thumbnail: string;
  readonly image: string | undefined;
}

export interface ResourcePost extends ResourcePostMeta {
  readonly content: string;
}
