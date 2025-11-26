import {useState, forwardRef, useEffect} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  IconButton,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText,
  Paper,
} from '@mui/material';
import {UilArrowLeft} from '@iconscout/react-unicons';
import type {Group} from '@/types/group';
import {InvitationDetails} from './InvitationDetails';
import {InvitationActions} from './InvitationActions';
import {useContactData} from "@/hooks/contacts/useContactData.ts";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts.ts";

export interface InvitationPageProps {
  className?: string;
}

export const InvitationPage = forwardRef<HTMLDivElement, InvitationPageProps>(
  ({className}, ref) => {
    const [group] = useState<Group | null>(null);
    const [isGroupInvite] = useState(false);
    const navigate = useNavigate();
    const [isSetup, setIsSetup] = useState(false);
    const {getCategoryDisplayName} = useRCardsConfigs();
    const {rCards} = useGetRCards();
    const [searchParams] = useSearchParams();
    const contactNuri = searchParams.get("contactNuri");
    const {contact} = useContactData(contactNuri);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const {updateContact} = useSaveContacts();

    useEffect(() => {
      const contactRCardId = contact?.rcard ? contact.rcard["@id"] : undefined;
      // Only set if rCards are loaded and the value exists in the list
      if (contactRCardId && rCards.some(rc => rc["@id"] === contactRCardId)) {
        setSelectedCategory(contactRCardId);
      }
    }, [contact, rCards]);

    const handleDownloadQR = () => {
      const svg = document.querySelector('#qr-code-svg') as SVGElement;
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);

          const pngFile = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = 'network-invitation-qr.png';
          downloadLink.href = pngFile;
          downloadLink.click();
        };

        img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
      }
    };

    const handleNewInvitation = async () => {

    };

    const handleBack = () => {
      if (isGroupInvite && group) {
        navigate(`/groups/${group.id}?newMember=true&fromInvite=true`);
      } else {
        navigate('/contacts');
      }
    };

    return (
      <Container ref={ref} maxWidth="md" sx={{p: 0}} className={className}>
        {/* Back Button */}
        <Box sx={{display: 'flex', alignItems: 'center', mb: 3}}>
          <IconButton onClick={handleBack} size="large">
            <UilArrowLeft size="20"/>
          </IconButton>
          <Typography variant="h6" sx={{ml: 1}}>
            {isGroupInvite ? `Back to ${group?.name}` : 'Back to Contacts'}
          </Typography>
        </Box>

        <Paper sx={{p: 3, display: 'flex', flexDirection: 'column', alignItems: "center", gap: 2, mb: 2}}>
          <InvitationDetails
            contact={contact}
            group={group}
            isGroupInvite={isGroupInvite}
          />

          <FormControl sx={{width: 200}}>
            <InputLabel id="relationship-category-label">Select RCard</InputLabel>
            <Select
              labelId="relationship-category-label"
              id="relationship-category-select"
              value={selectedCategory}
              label="Select RCard"
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                if (contact)
                  updateContact(contact["@id"]!, {rcard: {"@id": e.target.value}}).then(() => setSelectedCategory(e.target.value)
                  )
              }}
              displayEmpty={false}
            >
              {rCards.map((rCard) => (
                <MenuItem key={rCard["@id"]} value={rCard["@id"]}>
                  <ListItemText primary={getCategoryDisplayName(rCard.cardId)}/>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={isSetup}
                onChange={(e) => setIsSetup(e.target.checked)}
              />
            }
            label="I vouch this is a real person"
          />
        </Paper>

        {isSetup && selectedCategory && <InvitationActions
            group={group}
            isGroupInvite={isGroupInvite}
            onDownloadQR={handleDownloadQR}
            onNewInvitation={handleNewInvitation}
        />}
      </Container>
    );
  }
);

InvitationPage.displayName = 'InvitationPage';