import {FormPhoneField} from "@/components/ui/FormPhoneField/FormPhoneField";
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography} from "@mui/material";
import {useNavigate} from "react-router-dom";
import {forwardRef, useCallback, useState} from "react";

interface GreenCheckConnectionDialogProps {
  show: boolean;
  setShow: (show: boolean) => void;
}

export const GreenCheckConnectionDialog = forwardRef<HTMLDivElement, GreenCheckConnectionDialogProps>(
  ({show, setShow}, ref) => {
    const navigate = useNavigate();
    const [greencheckData, setGreencheckData] = useState({
      phone: '',
    });
    const [valid, setValid] = useState<boolean>(false);

    const handleGreencheckSubmit = useCallback(() => {
      navigate('/verify-phone/' + greencheckData.phone)
    }, [greencheckData.phone, navigate]);

    return <Dialog ref={ref} open={show} onClose={() => setShow(false)} maxWidth="sm"
                   fullWidth>
      <DialogTitle>Connect to Greencheck</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>
          Enter your details to verify and claim your accounts (and/or obtain your network graph) from other platforms via Greencheck.
        </Typography>

        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, pt: 1}}>
          <FormPhoneField
            fullWidth
            label="Phone number"
            value={greencheckData.phone}
            onChange={(e) => {
              setValid(e.isValid);
              setGreencheckData(prev => ({...prev, phone: e.target.value}))
            }}
            required
          />
        </Box>

        <Box sx={{
          mt: 3,
          p: 2,
          backgroundColor: 'info.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'info.200'
        }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Note:</strong> Greencheck will verify your identity and help you claim profiles from LinkedIn,
            Twitter, Facebook, and other platforms.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShow(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleGreencheckSubmit}
          disabled={!valid || greencheckData.phone.trim() === ""}
          size="small"
          sx={{p: 1}}
        >
          Connect to Greencheck
        </Button>
      </DialogActions>
    </Dialog>
  });