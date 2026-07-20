import {
  zodConversationType,
  zodFeedSortAlgorithm,
  zodRankingMode,
} from "src/shared/types/zod";
import { z } from "zod";

const authenticationSchema = z.object({
  isAuthInitialized: z.boolean(),
});

const verificationSchema = z.object({
  requestCodeThrottleUntil: z.date().nullable(),
  pendingOtpData: z
    .object({
      codeExpiry: z.date(),
      nextCodeSoonestTime: z.date(),
    })
    .nullable(),
});

const userSchema = z.object({
  profileData: z.object({
    dataLoaded: z.boolean(),
    postsLoadFailed: z.boolean(),
    commentsLoadFailed: z.boolean(),
  }),
});

const arraySchema = z.custom<unknown[]>((value) => Array.isArray(value));

const draftSchema = z.object({
  conversationDraft: z.object({
    conversationType: zodConversationType,
    rankingMode: zodRankingMode.optional(),
    aiLabelingEnabled: z.boolean(),
    multilingualSetting: z.object({
      dynamicTranslationEnabled: z.boolean(),
    }),
  }),
});

const homeFeedSchema = z.object({
  partialHomeFeedList: arraySchema,
  hasPendingNewTab: z.boolean(),
  hasPendingFollowingTab: z.boolean(),
  currentHomeFeedTab: zodFeedSortAlgorithm,
  canLoadMore: z.boolean(),
});

const notificationSchema = z.object({
  notificationList: arraySchema,
  numNewNotifications: z.number().int().nonnegative(),
});

const topicSchema = z.object({
  fullTopicList: arraySchema,
});

const conversationOnboardingSchema = z.object({
  conversationSlugId: z.string().nullable(),
  returnTarget: z.string().nullable(),
  returnHistoryPosition: z.number().int().nullable(),
  routeContext: z.object({
    kind: z.enum(["normal", "embed", "project"]),
  }),
  isResumeMode: z.boolean(),
  justCompletedSurvey: z.boolean(),
});

const navigationSchema = z.object({
  showMobileDrawer: z.boolean(),
  cameFromConversationCreation: z.boolean(),
});

const pageLayoutSchema = z.object({
  config: z.object({
    addGeneralPadding: z.boolean(),
    addBottomPadding: z.boolean(),
    enableHeader: z.boolean(),
    enableDrawer: z.boolean(),
    enableFooter: z.boolean(),
    reducedWidth: z.boolean(),
  }),
});

const layoutHeaderSchema = z.object({ reveal: z.boolean() });
const onboardingPreferencesSchema = z.object({
  showPreferencesDialog: z.boolean(),
});
const onboardingFlowSchema = z.object({
  onboardingMode: z.enum(["LOGIN", "SIGNUP"]),
  credentialUpgradeTarget: z.enum(["email", "strong", "hard"]).nullable(),
});
const embeddedBrowserWarningSchema = z.object({ showWarning: z.boolean() });

interface RedactedPiniaState {
  authentication?: z.output<typeof authenticationSchema>;
  phoneVerification?: VerificationSummary;
  emailVerification?: VerificationSummary;
  user?: z.output<typeof userSchema>;
  newPostDrafts?: DraftSummary;
  homeFeed?: HomeFeedSummary;
  notification?: NotificationSummary;
  topic?: { availableTopicCount: number };
  conversationOnboarding?: ConversationOnboardingSummary;
  navigation?: z.output<typeof navigationSchema>;
  pageLayout?: z.output<typeof pageLayoutSchema>;
  layoutHeader?: z.output<typeof layoutHeaderSchema>;
  onboardingPreferences?: z.output<typeof onboardingPreferencesSchema>;
  onboardingFlow?: z.output<typeof onboardingFlowSchema>;
  embeddedBrowserWarning?: z.output<typeof embeddedBrowserWarningSchema>;
}

interface VerificationSummary {
  hasRequestCodeThrottle: boolean;
  hasPendingOtp: boolean;
}

interface DraftSummary {
  conversationType: z.output<typeof zodConversationType>;
  rankingMode: z.output<typeof zodRankingMode> | undefined;
  aiLabelingEnabled: boolean;
  dynamicTranslationEnabled: boolean;
}

interface HomeFeedSummary {
  visibleConversationCount: number;
  hasPendingNewTab: boolean;
  hasPendingFollowingTab: boolean;
  currentHomeFeedTab: z.output<typeof zodFeedSortAlgorithm>;
  canLoadMore: boolean;
}

interface NotificationSummary {
  hasLoadedNotifications: boolean;
  hasNewNotifications: boolean;
}

interface ConversationOnboardingSummary {
  hasConversation: boolean;
  hasReturnTarget: boolean;
  hasReturnHistoryPosition: boolean;
  routeKind: "normal" | "embed" | "project";
  isResumeMode: boolean;
  justCompletedSurvey: boolean;
}

interface PiniaStateAttachment {
  filename: string;
  data: string;
  contentType: "application/json";
}

function parseStore<T>({
  state,
  storeId,
  schema,
}: {
  state: Record<string, unknown>;
  storeId: string;
  schema: z.ZodType<T>;
}): T | undefined {
  try {
    const result = schema.safeParse(state[storeId]);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function redactPiniaState(
  state: Record<string, unknown>
): RedactedPiniaState {
  const output: RedactedPiniaState = {};

  const authentication = parseStore({
    state,
    storeId: "authentication",
    schema: authenticationSchema,
  });
  if (authentication !== undefined) {
    output.authentication = authentication;
  }

  for (const storeId of ["phoneVerification", "emailVerification"] as const) {
    const verification = parseStore({
      state,
      storeId,
      schema: verificationSchema,
    });
    if (verification !== undefined) {
      output[storeId] = {
        hasRequestCodeThrottle: verification.requestCodeThrottleUntil !== null,
        hasPendingOtp: verification.pendingOtpData !== null,
      };
    }
  }

  const user = parseStore({ state, storeId: "user", schema: userSchema });
  if (user !== undefined) {
    output.user = user;
  }

  const drafts = parseStore({
    state,
    storeId: "newPostDrafts",
    schema: draftSchema,
  });
  if (drafts !== undefined) {
    const draft = drafts.conversationDraft;
    output.newPostDrafts = {
      conversationType: draft.conversationType,
      rankingMode: draft.rankingMode,
      aiLabelingEnabled: draft.aiLabelingEnabled,
      dynamicTranslationEnabled:
        draft.multilingualSetting.dynamicTranslationEnabled,
    };
  }

  const homeFeed = parseStore({
    state,
    storeId: "homeFeed",
    schema: homeFeedSchema,
  });
  if (homeFeed !== undefined) {
    output.homeFeed = {
      visibleConversationCount: homeFeed.partialHomeFeedList.length,
      hasPendingNewTab: homeFeed.hasPendingNewTab,
      hasPendingFollowingTab: homeFeed.hasPendingFollowingTab,
      currentHomeFeedTab: homeFeed.currentHomeFeedTab,
      canLoadMore: homeFeed.canLoadMore,
    };
  }

  const notification = parseStore({
    state,
    storeId: "notification",
    schema: notificationSchema,
  });
  if (notification !== undefined) {
    output.notification = {
      hasLoadedNotifications: notification.notificationList.length > 0,
      hasNewNotifications: notification.numNewNotifications > 0,
    };
  }

  const topic = parseStore({ state, storeId: "topic", schema: topicSchema });
  if (topic !== undefined) {
    output.topic = { availableTopicCount: topic.fullTopicList.length };
  }

  const conversationOnboarding = parseStore({
    state,
    storeId: "conversationOnboarding",
    schema: conversationOnboardingSchema,
  });
  if (conversationOnboarding !== undefined) {
    output.conversationOnboarding = {
      hasConversation: conversationOnboarding.conversationSlugId !== null,
      hasReturnTarget: conversationOnboarding.returnTarget !== null,
      hasReturnHistoryPosition:
        conversationOnboarding.returnHistoryPosition !== null,
      routeKind: conversationOnboarding.routeContext.kind,
      isResumeMode: conversationOnboarding.isResumeMode,
      justCompletedSurvey: conversationOnboarding.justCompletedSurvey,
    };
  }

  const navigation = parseStore({
    state,
    storeId: "navigation",
    schema: navigationSchema,
  });
  if (navigation !== undefined) {
    output.navigation = navigation;
  }

  const pageLayout = parseStore({
    state,
    storeId: "pageLayout",
    schema: pageLayoutSchema,
  });
  if (pageLayout !== undefined) {
    output.pageLayout = pageLayout;
  }

  const layoutHeader = parseStore({
    state,
    storeId: "layoutHeader",
    schema: layoutHeaderSchema,
  });
  if (layoutHeader !== undefined) {
    output.layoutHeader = layoutHeader;
  }

  const onboardingPreferences = parseStore({
    state,
    storeId: "onboardingPreferences",
    schema: onboardingPreferencesSchema,
  });
  if (onboardingPreferences !== undefined) {
    output.onboardingPreferences = onboardingPreferences;
  }

  const onboardingFlow = parseStore({
    state,
    storeId: "onboardingFlow",
    schema: onboardingFlowSchema,
  });
  if (onboardingFlow !== undefined) {
    output.onboardingFlow = onboardingFlow;
  }

  const embeddedBrowserWarning = parseStore({
    state,
    storeId: "embeddedBrowserWarning",
    schema: embeddedBrowserWarningSchema,
  });
  if (embeddedBrowserWarning !== undefined) {
    output.embeddedBrowserWarning = embeddedBrowserWarning;
  }

  return output;
}

export function createPiniaStateAttachment(
  state: Record<string, unknown>
): PiniaStateAttachment {
  return {
    filename: "pinia_state.json",
    data: JSON.stringify(redactPiniaState(state)),
    contentType: "application/json",
  };
}
