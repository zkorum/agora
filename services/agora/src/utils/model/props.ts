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
  centerContent?: boolean; // Forces perfect visual centering
  clickToScrollTop?: boolean; // Default: true
}
