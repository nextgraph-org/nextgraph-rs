import {Box, Typography} from '@mui/material';
import {NetworkGraph} from '@/components/network/NetworkGraph';
import {ShortSocialContactShapeType} from "@/.orm/shapes/shortcontact.shapeTypes.ts";
import {ShortSocialContact} from "@/.orm/shapes/shortcontact.typings.ts";
import {useContacts} from "@/hooks/contacts/useContacts.ts";
import {useEffect, useState} from "react";
import {getObjects} from "../../../../../../sdk/js/orm";
import {Button} from "@/components/ui";
import {UilCheck} from "@iconscout/react-unicons";
import {useGreenCheck} from "@/hooks/useGreenCheck.ts";

export const ContactNetworkTab = () => {
  const {handleGreencheckConnect} = useGreenCheck(true);
  const {
    contactNuris,
  } = useContacts({
    limit: 0,
    initialFilters: {
      "hasNetworkCentralityFilter": true
    }
  });

  const [contacts, setContacts] = useState<ShortSocialContact[]>([]);

  useEffect(() => {
    const loadContacts = async () => {
      if (contactNuris.length > 0) {
        const contactsSet = await getObjects(ShortSocialContactShapeType, {graphs: contactNuris});
        const contactsArray = [...contactsSet ?? []];
        setContacts(contactsArray);
      }
    };

    loadContacts();
  }, [contactNuris]);

  if (contacts.length === 0) {
    return <Box sx={{textAlign: 'center', py: 8}}>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No contacts with network centrality score found.
      </Typography>
      <Button
        variant="contained"
        size="small"
        onClick={handleGreencheckConnect}
        sx={{p: 1, minWidth: "26px"}}
      >
        <UilCheck size="20" sx={{p: 0}}/>Obtain Network Centrality

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