export interface MainLayoutProps {
  generalProps: GeneralProps;
}

export interface GeneralProps {
  addGeneralPadding: boolean;
  addBottomPadding: boolean;
  enableHeader: boolean;
  enableFooter: boolean;
  reducedWidth: boolean;
}

export interface DefaultMenuBarProps {
  hasMenuButton: boolean;
  hasLoginButton: boolean;
  hasBackButton: boolean;
  hasCloseButton: boolean;
  fixedHeight: boolean;
}
