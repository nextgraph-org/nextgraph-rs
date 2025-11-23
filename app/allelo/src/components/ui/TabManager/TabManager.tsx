import {Tabs, Tab, Box} from "@mui/material";
import {ReactElement, ReactNode, useEffect, useState} from "react";

export type TabItem = {
  label: ReactNode;
  icon?: ReactElement;
  content: ReactNode;
  disabled?: boolean;
};

interface TabManagerProps {
  tabItems: TabItem[];
  initialIndex?: number;
  onChange?: (index: number) => void;
}

export function TabManager({
                             tabItems,
                             initialIndex = 0,
                             onChange,
                           }: TabManagerProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const handleChange = (_: React.SyntheticEvent, newIndex: number) => {
    setIndex(newIndex);
    onChange?.(newIndex);
  };

  const a11y = (i: number) => ({
    id: `tm-tab-${i}`,
    "aria-controls": `tm-panel-${i}`,
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Tabs
        value={index}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          "& .MuiTabs-flexContainer": {gap: {xs: 0, md: 1}},
          "& .MuiTab-root": {
            minWidth: {xs: "auto", md: 120},
            fontSize: {xs: "0.75rem", md: "0.875rem"},
            px: {xs: 1, md: 2},
          },
          minWidth: 0,
          borderBottom: 1,
          borderColor: "divider",
          mb: 1,
          flexShrink: 0,
        }}
        aria-label="tabs"
      >
        {tabItems.map((item, i) => (
          <Tab
            key={i}
            label={item.label}
            icon={item.icon}
            iconPosition={item.icon ? "start" : undefined}
            disabled={item.disabled}
            {...a11y(i)}
          />
        ))}
      </Tabs>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {tabItems[index].content}
      </Box>
    </Box>
  );
}
