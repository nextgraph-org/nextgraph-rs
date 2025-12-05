import { forwardRef } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';
// Note: Using standard avatar styling instead of getContactPhotoStyles
import {SocialGroup} from "@/.orm/shapes/group.typings.ts";
import {GroupTags} from "@/components/groups/GroupTags/GroupTags.tsx";

export interface GroupStatsProps {
  group: SocialGroup;
  memberCount: number;
}

export const GroupStats = forwardRef<HTMLDivElement, GroupStatsProps>(
  ({ group }, ref) => {
    return (
      <Box ref={ref} sx={{ mb: 3 }}>
        {/* Group Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              About this group
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
              {group.description}
            </Typography>

            <GroupTags group={group} disabled={true}/>
          </CardContent>
        </Card>
      </Box>
    );
  }
);

GroupStats.displayName = 'GroupStats';