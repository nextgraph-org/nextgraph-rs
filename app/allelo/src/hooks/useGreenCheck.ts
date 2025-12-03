import {useSettings} from "@/hooks/useSettings.ts";
import {useCallback, useState} from "react";
import {getPropsByFilter} from "@/utils/socialContact/contactUtils.ts";
import {useContactData} from "@/hooks/contacts/useContactData.ts";
import {useNavigate} from "react-router-dom";

export const useGreenCheck = () => {
  const {settings} = useSettings();
  const navigate = useNavigate();
  const [showGreencheckDialog, setShowGreencheckDialog] = useState(false);
  const {contact} = useContactData(null, true);
  const phones = getPropsByFilter(contact, "phoneNumber", {source: "GreenCheck"});
  const verified = Boolean(settings?.greencheckId);

  const handleGreencheckConnect = useCallback(() => {
    if (verified && phones?.length > 0) {
      navigate('/verify-phone/' + phones[0].value);
    } else {
      setShowGreencheckDialog(true);
    }
  }, [navigate, phones, verified]);
  return {
    showGreencheckDialog,
    handleGreencheckConnect,
    setShowGreencheckDialog,
    verified
  }
}