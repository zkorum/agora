import { type RouteRecordRaw } from "vue-router";
import MainLayout from "layouts/MainLayout.vue";
import DefaultMenuBar from "src/components/navigation/DefaultMenuBar.vue";
import {
  type MainLayoutProps,
  type DefaultMenuBarProps,
} from "src/utils/model/props";
import UserPostList from "src/components/profile/UserPostList.vue";
import UserCommentList from "src/components/profile/UserCommentList.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: MainLayout,
    props: {
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: false,
    } as MainLayoutProps,
    children: [
      {
        path: "/",
        components: {
          default: () => import("pages/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: true,
            hasCloseButton: false,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "default-home-feed",
      },
      {
        path: "/user-profile",
        components: {
          default: () => import("pages/user-profile/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: true,
            hasCloseButton: false,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        children: [
          {
            path: "posts",
            component: UserPostList,
            name: "user-profile-posts",
          },
          {
            path: "comments",
            component: UserCommentList,
            name: "user-profile-comments",
          },
        ],
      },
      {
        path: "/user-reports/:reportType/:slugId",
        components: {
          default: () => import("pages/user-reports/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: true,
            hasCloseButton: false,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "user-report-viewer",
      },
    ],
  },
  {
    path: "/post",
    component: MainLayout,
    props: {
      addBottomPadding: false,
      enableHeader: false,
      enableFooter: false,
      reducedWidth: false,
    } as MainLayoutProps,
    children: [
      {
        path: "create",
        components: {
          default: () => import("pages/post/create/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: false,
            hasCloseButton: true,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "create-post",
      },
    ],
  },
  {
    path: "/moderate",
    component: MainLayout,
    props: {
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: false,
    } as MainLayoutProps,
    children: [
      {
        path: "post/:postSlugId",
        components: {
          default: () => import("pages/moderate/post/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: false,
            hasCloseButton: true,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "moderate-post-page",
      },
      {
        path: "comment/:commentSlugId",
        components: {
          default: () => import("pages/moderate/comment/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: false,
            hasCloseButton: true,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "moderate-comment-page",
      },
    ],
  },
  {
    path: "/",
    component: MainLayout,
    props: {
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
    } as MainLayoutProps,
    children: [
      {
        path: "/help",
        components: {
          default: () => import("pages/help/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: true,
            hasCloseButton: true,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "help-page",
      },
      {
        path: "/settings",
        components: {
          default: () => import("pages/settings/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: true,
            hasCloseButton: true,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "settings-page",
      },
      {
        path: "/settings/account/profile",
        components: {
          default: () => import("pages/settings/account/profile/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: true,
            hasCloseButton: true,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "settings-account-profile",
      },
      {
        path: "/settings/account/muted-users",
        components: {
          default: () => import("pages/settings/account/muted-users/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: true,
            hasCloseButton: true,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "settings-account-muted-users",
      },
      {
        path: "/legal/privacy",
        components: {
          default: () => import("pages/legal/privacy/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: false,
            hasCloseButton: true,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "privacy",
      },
      {
        path: "/legal/terms",
        components: {
          default: () => import("pages/legal/terms/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: false,
            hasSettingsButton: false,
            hasCloseButton: true,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "terms",
      },
    ],
  },
  {
    path: "/post",
    component: MainLayout,
    props: {
      addBottomPadding: true,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
    } as MainLayoutProps,
    children: [
      {
        path: ":postSlugId",
        components: {
          default: () => import("pages/post/[postSlugId].vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          default: true,
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: true,
            hasCloseButton: false,
            hasLoginButton: true,
          } as DefaultMenuBarProps,
        },
        name: "single-post",
      },
    ],
  },
  {
    path: "/welcome",
    components: {
      default: () => import("pages/welcome/index.vue"),
    },
    name: "welcome",
  },
  {
    path: "/onboarding",
    components: {
      default: MainLayout,
    },
    props: {
      default: {
        addBottomPadding: false,
        enableHeader: true,
        enableFooter: false,
        useStylelessFooter: false,
        reducedWidth: true,
      } as MainLayoutProps,
    },
    children: [
      {
        path: "step1-login",
        components: {
          default: () => import("src/pages/onboarding/step1-login/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: false,
            hasCloseButton: false,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "onboarding-step1-login",
      },
      {
        path: "step1-signup",
        components: {
          default: () => import("src/pages/onboarding/step1-signup/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: false,
            hasCloseButton: false,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "onboarding-step1-signup",
      },
      {
        path: "step2-signup",
        components: {
          default: () => import("src/pages/onboarding/step2-signup/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: false,
            hasCloseButton: false,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "onboarding-step2-signup",
      },
      {
        path: "step3-passport",
        components: {
          default: () =>
            import("src/pages/onboarding/step3-passport/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: false,
            hasCloseButton: false,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "onboarding-step3-passport",
      },
      {
        path: "step3-phone-1",
        components: {
          default: () => import("src/pages/onboarding/step3-phone-1/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: false,
            hasCloseButton: false,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "onboarding-step3-phone-1",
      },
      {
        path: "step3-phone-2",
        components: {
          default: () => import("src/pages/onboarding/step3-phone-2/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: false,
            hasCloseButton: false,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "onboarding-step3-phone-2",
      },
      {
        path: "step4-username",
        components: {
          default: () =>
            import("src/pages/onboarding/step4-username/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: false,
            hasCloseButton: false,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "onboarding-step4-username",
      },
      {
        path: "step5-experience",
        components: {
          default: () =>
            import("src/pages/onboarding/step5-preferences/index.vue"),
          topmenubar: DefaultMenuBar,
        },
        props: {
          topmenubar: {
            hasBackButton: true,
            hasSettingsButton: false,
            hasCloseButton: false,
            hasLoginButton: false,
          } as DefaultMenuBarProps,
        },
        name: "onboarding-step5-preferences",
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    redirect: "/",
  },
];

export default routes;
