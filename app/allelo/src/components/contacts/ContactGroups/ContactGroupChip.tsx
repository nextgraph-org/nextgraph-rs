import {Chip} from "@mui/material";
import {useGroupData} from "@/hooks/groups/useGroupData.ts";
import {useNavigate} from "react-router-dom";

export const ContactGroupChip = ({groupNuri}: {groupNuri: string}) => {
  const {group} = useGroupData(groupNuri);
  const navigate = useNavigate();

  return <Chip
    key={groupNuri}
    label={group?.title}
    size="small"
    variant="outlined"
    clickable
    onClick={() => navigate(`/groups/${groupNuri}`)}
    sx={{
      borderRadius: 1,
      '&:hover': {
        backgroundColor: 'action.hover',
      },
    }}
  />
}