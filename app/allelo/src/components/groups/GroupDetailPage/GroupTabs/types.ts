export interface GroupTabsProps {
  tabValue: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}