import { Box } from '@mui/material';
import { NetworkGraph } from '@/components/network/NetworkGraph';
import { useNetworkGraph } from '@/hooks/network/useNetworkGraph';
import {useShape} from "@ng-org/orm/react";
import {ShortSocialContactShapeType} from "@/.orm/shapes/shortcontact.shapeTypes.ts";
import {ShortSocialContact} from "@/.orm/shapes/shortcontact.typings.ts";

export const ContactNetworkTab = () => {
  const contactsSet = useShape(ShortSocialContactShapeType, "did:ng:i") as Set<ShortSocialContact>; //TODO: privateStoreId

  // Build the network graph from loaded contacts
  useNetworkGraph({ contacts: [...contactsSet ?? []] });

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <NetworkGraph />
    </Box>
  );
};