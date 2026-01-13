import React, {useEffect, useState} from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Phone,
  Sms,
} from "@mui/icons-material";
import {FormPhoneField} from "@/components/ui/FormPhoneField/FormPhoneField";
import {useFieldValidation} from "@/hooks/useFieldValidation";

interface PhoneInputProps {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
                                                 phoneNumber,
                                                 setPhoneNumber,
                                                 isLoading,
                                                 error,
                                                 onSubmit,
                                               }) => {
  const [valid, setValid] = useState<boolean>(false);
  const phoneValidation = useFieldValidation(phoneNumber, "phone", { validateOn: "change" });

  useEffect(() => {
    phoneValidation.triggerField().then((el) => setValid(el));
  }, [phoneNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card sx={{maxWidth: 500, mx: 'auto', mt: 4}}>
      <CardContent sx={{p: {xs: 2, md: 4}}}>
        <Box sx={{textAlign: 'center', mb: 3}}>
          <Phone sx={{fontSize: 40, color: 'primary.main', mb: 2}}/>
          <Typography variant="h5" component="h1" gutterBottom sx={{fontWeight: 600}}>
            Verify Your Phone
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your phone number to get started with GreenCheck verification. GreenCheck is a secure service partner of Allelo, that helps with retrieving information from other platforms.
          </Typography>
        </Box>

        <Box component="form" onSubmit={onSubmit} sx={{mt: 3}}>
          <FormPhoneField
            fullWidth
            value={phoneNumber}
            onChange={(e) => {
              setValid(e.isValid);
              setPhoneNumber(e.target.value)
            }}
            placeholder="+1234567890"
            disabled={isLoading}
            sx={{mb: 2}}
          />

          {error && (
            <Alert severity="error" sx={{mb: 3}}>
              {error}
            </Alert>
          )}

          <Box sx={{display: 'flex', gap: 2}}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading || phoneNumber.trim() === "" || !valid}
              startIcon={isLoading ? <CircularProgress size={20}/> : <Sms/>}
              sx={{p: 1}}
            >
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PhoneInput;