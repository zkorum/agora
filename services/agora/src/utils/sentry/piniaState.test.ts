import {
  createPiniaStateAttachment,
  redactPiniaState,
} from "src/utils/sentry/piniaState";
import { describe, expect, it } from "vitest";

function privateState(): Record<string, unknown> {
  return {
    authentication: {
      isAuthInitialized: true,
      verificationPhoneNumber: "+33123456789",
    },
    phoneVerification: {
      verificationPhoneNumber: {
        internationalPhoneNumber: "+33123456789",
        countryCallingCode: "33",
      },
      requestCodeThrottleUntil: new Date(),
      pendingOtpData: {
        codeExpiry: new Date(),
        nextCodeSoonestTime: new Date(),
      },
    },
    emailVerification: {
      verificationEmail: "private@example.com",
      requestCodeThrottleUntil: null,
      pendingOtpData: null,
    },
    user: {
      profileData: {
        userName: "private-user",
        dataLoaded: true,
        postsLoadFailed: false,
        commentsLoadFailed: true,
        organizationList: [{ name: "private-organization" }],
      },
    },
    newPostDrafts: {
      conversationDraft: {
        title: "private title",
        content: "private body",
        seedOpinions: ["private statement"],
        conversationType: "ranking",
        rankingMode: "bws",
        isPrivate: true,
        participationMode: "account_required",
        aiLabelingEnabled: false,
        multilingualSetting: { dynamicTranslationEnabled: true },
        surveyConfig: { questions: [{ text: "private question" }] },
        importSettings: {
          importType: "csv-import",
          polisUrl: "https://example.com/private",
        },
      },
    },
    homeFeed: {
      partialHomeFeedList: [
        { title: "private feed title", conversationSlugId: "private-slug" },
      ],
      hasPendingNewTab: true,
      hasPendingFollowingTab: false,
      currentHomeFeedTab: "following",
      canLoadMore: true,
    },
    notification: {
      notificationList: [{ message: "private notification" }],
      numNewNotifications: 1,
    },
    topic: {
      fullTopicList: [{ code: "public-topic" }],
      followedTopicCodeSet: new Set(["private-followed-topic"]),
    },
    conversationOnboarding: {
      conversationSlugId: "private-conversation",
      returnTarget: "/conversation/private-conversation",
      returnHistoryPosition: 4,
      routeContext: { kind: "project", projectSlug: "private-project" },
      isResumeMode: true,
      justCompletedSurvey: false,
    },
    pageLayout: {
      config: {
        addGeneralPadding: true,
        addBottomPadding: false,
        enableHeader: true,
        enableDrawer: false,
        enableFooter: false,
        reducedWidth: true,
      },
      routeName: "private-route",
    },
    layoutHeader: {
      reveal: false,
      title: "private title",
    },
    embeddedBrowserWarning: {
      showWarning: true,
      appName: "private-app-name",
    },
    loginIntention: { activeUserIntention: "private-intention" },
    unknownFutureStore: { secret: "private-future-value" },
  };
}

describe("Sentry Pinia state privacy", () => {
  it("keeps operational state without retaining identifying values", () => {
    const output = redactPiniaState(privateState());

    expect(output).toEqual({
      pageLayout: {
        config: {
          addGeneralPadding: true,
          addBottomPadding: false,
          enableHeader: true,
          enableDrawer: false,
          enableFooter: false,
          reducedWidth: true,
        },
      },
      layoutHeader: { reveal: false },
    });

    const serialized = JSON.stringify(output);
    expect(serialized).not.toContain("private");
    expect(serialized).not.toContain("+33");
    expect(serialized).not.toContain("example.com");
  });

  it("omits a malformed store without losing valid stores", () => {
    const malformedLayoutHeader = {};
    Object.defineProperty(malformedLayoutHeader, "reveal", {
      get() {
        throw new Error("unreadable state");
      },
    });

    expect(
      redactPiniaState({
        pageLayout: privateState().pageLayout,
        layoutHeader: malformedLayoutHeader,
      })
    ).toEqual({
      pageLayout: {
        config: {
          addGeneralPadding: true,
          addBottomPadding: false,
          enableHeader: true,
          enableDrawer: false,
          enableFooter: false,
          reducedWidth: true,
        },
      },
    });
  });

  it("creates one JSON attachment containing only redacted state", () => {
    const attachment = createPiniaStateAttachment(privateState());

    expect(attachment.filename).toBe("pinia_state.json");
    expect(attachment.contentType).toBe("application/json");
    expect(JSON.parse(attachment.data)).toEqual(
      redactPiniaState(privateState())
    );
  });
});
