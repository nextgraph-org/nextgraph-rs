import {useSettings} from "@/hooks/useSettings.ts";
import {useCallback, useState} from "react";
import {getPropsByFilter} from "@/utils/socialContact/contactUtilsOrm.ts";
import {useNavigate} from "react-router-dom";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";

export const useGreenCheck = () => {
  const {settings} = useSettings();
  const navigate = useNavigate();
  const [showGreencheckDialog, setShowGreencheckDialog] = useState(false);
  const {ormContact} = useContactOrm(null, true);
  const phones = getPropsByFilter(ormContact, "phoneNumber", {source: "GreenCheck"});
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