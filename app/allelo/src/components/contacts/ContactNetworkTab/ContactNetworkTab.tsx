import {Box, Typography} from '@mui/material';
import {NetworkGraph} from '@/components/network/NetworkGraph';
import {useContacts} from "@/hooks/contacts/useContacts.ts";
import {useContactObjects} from "@/hooks/contacts/useContactObjects.ts";
import {Button} from "@/components/ui";
import {UilCheck} from "@iconscout/react-unicons";
import {useGreenCheck} from "@/hooks/useGreenCheck.ts";

export const ContactNetworkTab = () => {
  const {handleGreencheckConnect} = useGreenCheck(true);
  const {
    contactNuris,
    isLoading: isNuriLoading,
  } = useContacts({
    limit: 0,
    initialFilters: {
      "hasNetworkCentralityFilter": true
    }
  });

  const { contacts, isLoading } = useContactObjects({ contactNuris, isNuriLoading });

  if (isLoading) {
    return  <Box sx={{textAlign: 'center', py: 8}}>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Loading contacts...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Please wait while we fetch your contacts
      </Typography>
    </Box>
  }

  if (contacts.length === 0) {
    return <Box sx={{textAlign: 'center', py: 8}}>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        We don't have the network information about your contacts yet.
      </Typography>
      <Button
        variant="contained"
        size="small"
        onClick={handleGreencheckConnect}
        sx={{p: 1, minWidth: "26px"}}
      >
        <UilCheck size="20" sx={{p: 0}}/>Obtain Network Graph

      </Button>
    </Box>
  }


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
      <NetworkGraph contacts={contacts}/>
    </Box>
  );
};