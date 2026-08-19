import type {
  ConversationUpdateConversationSummary,
  ConversationUpdateHistoryRecord,
  ConversationUpdatePreferenceState,
  ConversationUpdatePreferenceSummary,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";

export const prototypeScopes: readonly ConversationUpdateScopeSummary[] = [
  {
    id: "project-harbor-heat",
    kind: "project",
    label: "Harbor Heat Resilience Plan",
    href: "/project/harbor-heat-resilience-plan",
    contactEmail: "climate@civicharbor.example",
    eligibleParticipantCap: 1840,
    conversations: [
      {
        id: "conversation-cooling-centers",
        title: "Where should neighborhood cooling centers open?",
        href: "/project/harbor-heat-resilience-plan/conversation/cooling-centers/",
        eligibleParticipantCount: 920,
        participationMode: "email_verification",
        ownerIds: ["owner-ana", "owner-ben"],
      },
      {
        id: "conversation-shade",
        title: "Priorities for shaded streets and bus stops",
        href: "/project/harbor-heat-resilience-plan/conversation/shaded-streets/",
        eligibleParticipantCount: 740,
        participationMode: "account_required",
        ownerIds: ["owner-ben", "owner-caro"],
      },
      {
        id: "conversation-home-retrofits",
        title: "How should home heat-retrofit grants work?",
        href: "/project/harbor-heat-resilience-plan/conversation/home-retrofits/",
        eligibleParticipantCount: 510,
        participationMode: "strong_verification",
        ownerIds: ["owner-dan"],
      },
      {
        id: "conversation-heat-alerts",
        title: "How should neighborhood heat alerts work?",
        href: "/project/harbor-heat-resilience-plan/conversation/heat-alerts/",
        eligibleParticipantCount: 470,
        participationMode: "email_verification",
        ownerIds: ["owner-ana"],
      },
      {
        id: "conversation-water-stations",
        title: "Where are public water stations most needed?",
        href: "/project/harbor-heat-resilience-plan/conversation/water-stations/",
        eligibleParticipantCount: 560,
        participationMode: "guest",
        ownerIds: ["owner-erin"],
      },
      {
        id: "conversation-cool-parks",
        title: "Which parks should stay open later during heat waves?",
        href: "/project/harbor-heat-resilience-plan/conversation/cool-parks/",
        eligibleParticipantCount: 430,
        participationMode: "account_required",
        ownerIds: ["owner-caro"],
      },
    ],
  },
  {
    id: "project-night-transit",
    kind: "project",
    label: "Night Transit Review",
    href: "/project/night-transit-review",
    contactEmail: "mobility@civicharbor.example",
    eligibleParticipantCap: 1260,
    conversations: [
      {
        id: "conversation-night-routes",
        title: "Which night routes matter most?",
        href: "/project/night-transit-review/conversation/night-routes/",
        eligibleParticipantCount: 810,
        participationMode: "guest",
        ownerIds: ["owner-farah", "owner-gabriel"],
      },
      {
        id: "conversation-safety",
        title: "Safer stops after midnight",
        href: "/project/night-transit-review/conversation/safer-stops/",
        eligibleParticipantCount: 690,
        participationMode: "email_verification",
        ownerIds: ["owner-gabriel"],
      },
    ],
  },
  {
    id: "no-project",
    kind: "no-project",
    label: "No Project",
    href: undefined,
    contactEmail: "hello@civicharbor.example",
    eligibleParticipantCap: 910,
    conversations: [
      {
        id: "conversation-old-market",
        title: "Should Old Market Square become car-free on weekends?",
        href: "/conversation/old-market-square/",
        eligibleParticipantCount: 612,
        participationMode: "guest",
        ownerIds: ["owner-hana"],
      },
      {
        id: "conversation-library-hours",
        title: "When should the central library stay open later?",
        href: "/conversation/central-library-hours/",
        eligibleParticipantCount: 438,
        participationMode: "account_required",
        ownerIds: ["owner-ivan"],
      },
      {
        id: "conversation-river-path",
        title: "What would make the river path safer after dark?",
        href: "/conversation/river-path-safety/",
        eligibleParticipantCount: 527,
        participationMode: "strong_verification",
        ownerIds: ["owner-jules"],
      },
    ],
  },
];

export const initialPrototypeHistory: readonly ConversationUpdateHistoryRecord[] =
  [
    {
      id: "update-fixture-completed",
      subject: "What we heard about cooler streets",
      bodyHtml:
        "<p>Thank you for helping identify the neighborhoods most exposed to extreme heat.</p><p>Your input shaped the shortlist for cooling-center locations and the next street-shade workshop.</p>",
      scopeKind: "project",
      scopeLabel: "Harbor Heat Resilience Plan",
      scopeHref: "/project/harbor-heat-resilience-plan",
      conversations: [
        {
          title: "Where should neighborhood cooling centers open?",
          href: "/project/harbor-heat-resilience-plan/conversation/cooling-centers/",
        },
        {
          title: "Priorities for shaded streets and bus stops",
          href: "/project/harbor-heat-resilience-plan/conversation/shaded-streets/",
        },
      ],
      audienceEstimate: 1458,
      ownerCopyCount: 3,
      createdAtLabel: "12 Aug 2026, 14:30",
      status: "completed",
      reason: undefined,
    },
    {
      id: "update-fixture-owner-copy-failed",
      subject: "Cooling-center shortlist ready for review",
      bodyHtml:
        "<p>We prepared the latest cooling-center shortlist and next-step schedule.</p>",
      scopeKind: "project",
      scopeLabel: "Harbor Heat Resilience Plan",
      scopeHref: "/project/harbor-heat-resilience-plan",
      conversations: [
        {
          title: "Where should neighborhood cooling centers open?",
          href: "/project/harbor-heat-resilience-plan/conversation/cooling-centers/",
        },
      ],
      audienceEstimate: 920,
      ownerCopyCount: 2,
      createdAtLabel: "9 Aug 2026, 11:20",
      status: "failed",
      reason: "required_owner_copy_not_accepted",
    },
    {
      id: "update-fixture-stopped",
      subject: "Night transit workshop follow-up",
      bodyHtml:
        "<p>Thank you for contributing to the night-route workshop.</p><p>We prepared the next review schedule and a summary of the route priorities.</p>",
      scopeKind: "project",
      scopeLabel: "Night Transit Review",
      scopeHref: "/project/night-transit-review",
      conversations: [
        {
          title: "Which night routes matter most?",
          href: "/project/night-transit-review/conversation/night-routes/",
        },
      ],
      audienceEstimate: 810,
      ownerCopyCount: 2,
      createdAtLabel: "6 Aug 2026, 09:15",
      status: "stopped",
      reason: "emergency_legal_or_abuse_block",
    },
  ];

export function getInitialConversationIds(
  scope: ConversationUpdateScopeSummary | undefined
): readonly string[] {
  const firstConversation = scope?.conversations.at(0);
  return firstConversation === undefined ? [] : [firstConversation.id];
}

export function getSelectedConversations({
  scope,
  selectedConversationIds,
}: {
  scope: ConversationUpdateScopeSummary | undefined;
  selectedConversationIds: readonly string[];
}): readonly ConversationUpdateConversationSummary[] {
  if (scope === undefined) {
    return [];
  }

  const selectedIds = new Set(selectedConversationIds);
  return scope.conversations.filter((conversation) =>
    selectedIds.has(conversation.id)
  );
}

export function estimatePrototypeAudience({
  scope,
  selectedConversationIds,
}: {
  scope: ConversationUpdateScopeSummary | undefined;
  selectedConversationIds: readonly string[];
}): number {
  const selectedConversations = getSelectedConversations({
    scope,
    selectedConversationIds,
  });
  if (scope === undefined || selectedConversations.length === 0) {
    return 0;
  }

  const summedParticipants = selectedConversations.reduce(
    (total, conversation) => total + conversation.eligibleParticipantCount,
    0
  );
  const overlapFactor = 1 - (selectedConversations.length - 1) * 0.12;
  return Math.min(
    scope.eligibleParticipantCap,
    Math.round(summedParticipants * Math.max(overlapFactor, 0.6))
  );
}

export function countRelatedConversationOwners({
  scope,
  selectedConversationIds,
}: {
  scope: ConversationUpdateScopeSummary | undefined;
  selectedConversationIds: readonly string[];
}): number {
  const ownerIds = getSelectedConversations({
    scope,
    selectedConversationIds,
  }).flatMap((conversation) => conversation.ownerIds);
  return new Set(ownerIds).size;
}

export function createPrototypeRevisionKey({
  scopeId,
  contactEmail,
  selectedConversationIds,
  subject,
  bodyHtml,
}: {
  scopeId: string;
  contactEmail: string;
  selectedConversationIds: readonly string[];
  subject: string;
  bodyHtml: string;
}): string {
  return JSON.stringify({
    templateVersion: "conversation-update-prototype-v1",
    scopeId,
    contactEmail,
    selectedConversationIds,
    subject,
    bodyHtml,
  });
}

export function getEffectivePrototypeConversationPreference({
  scopeKind,
  projectState,
  conversationState,
}: {
  scopeKind: ConversationUpdateScopeSummary["kind"];
  projectState: ConversationUpdatePreferenceState;
  conversationState: ConversationUpdatePreferenceState;
}): boolean {
  if (scopeKind === "no-project") {
    return conversationState === "enabled";
  }
  if (projectState === "disabled") {
    return false;
  }
  if (conversationState === "enabled") {
    return true;
  }
  if (conversationState === "disabled") {
    return false;
  }
  return projectState === "enabled";
}

export function isPrototypeConversationUpdateEffective({
  hasEntitlement,
  projectDefaultEnabled,
  conversationOverride,
}: {
  hasEntitlement: boolean;
  projectDefaultEnabled: boolean;
  conversationOverride: boolean | undefined;
}): boolean {
  return (
    hasEntitlement && (conversationOverride ?? projectDefaultEnabled)
  );
}

export function enableOnlyPrototypeConversationInProject({
  conversationPreferences,
  projectConversationIds,
  selectedConversationId,
}: {
  conversationPreferences: readonly ConversationUpdatePreferenceSummary[];
  projectConversationIds: ReadonlySet<string>;
  selectedConversationId: string;
}): {
  projectState: "enabled";
  conversationPreferences: readonly ConversationUpdatePreferenceSummary[];
} {
  return {
    projectState: "enabled",
    conversationPreferences: conversationPreferences.map((preference) =>
      projectConversationIds.has(preference.conversationId)
        ? {
            ...preference,
            state:
              preference.conversationId === selectedConversationId
                ? "enabled"
                : "disabled",
          }
        : preference
    ),
  };
}

export function advancePrototypeStatus({
  records,
  recordId,
}: {
  records: readonly ConversationUpdateHistoryRecord[];
  recordId: string;
}): readonly ConversationUpdateHistoryRecord[] {
  return records.map((record) =>
    record.id === recordId ? advancePrototypeRecord(record) : record
  );
}

function advancePrototypeRecord(
  record: ConversationUpdateHistoryRecord
): ConversationUpdateHistoryRecord {
  switch (record.status) {
    case "preparing":
      return { ...record, status: "queued", reason: undefined };
    case "queued":
      return { ...record, status: "sending", reason: undefined };
    case "sending":
      return { ...record, status: "completed", reason: undefined };
    case "stopping":
      return { ...record, status: "stopped", reason: record.reason };
    case "completed":
    case "completed_with_failures":
    case "failed":
    case "stopped":
      return record;
  }
}
