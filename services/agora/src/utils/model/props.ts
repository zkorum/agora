export interface MainLayoutProps {
  generalProps: GeneralProps;
  menuBarProps: DefaultMenuBarProps;
}

export interface GeneralProps {
  addBottomPadding: boolean;
  enableHeader: boolean;
  enableFooter: boolean;
  reducedWidth: boolean;
}

export interface DefaultMenuBarProps {
  hasLoginButton: boolean;
  hasBackButton: boolean;
  hasCloseButton: boolean;
  hasSettingsButton: boolean;
}
