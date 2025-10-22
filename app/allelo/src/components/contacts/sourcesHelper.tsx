import {Source} from "@/types/contact";
import {Check, Google, LinkedIn, Person, ContactPage, PhoneAndroid, PhoneIphone} from "@mui/icons-material";

export const getSourceIcon = (source: Source | string) => {
  switch (source) {
    case 'user':
      return <Person fontSize="small" sx={{fontSize: {xs: "14px", md: "18px"}}}/>;
    case 'linkedin':
      return <LinkedIn fontSize="small" sx={{fontSize: {xs: "14px", md: "18px"}}}/>;
    case 'Android Phone':
      return <PhoneAndroid fontSize="small" sx={{fontSize: {xs: "14px", md: "18px"}}}/>;
    case 'iPhone':
      return <PhoneIphone fontSize="small" sx={{fontSize: {xs: "14px", md: "18px"}}}/>;
    case "Gmail":
      return <Google fontSize="small" sx={{fontSize: {xs: "14px", md: "18px"}}}/>;
    case "GreenCheck":
      return <Check fontSize="small" sx={{fontSize: {xs: "14px", md: "18px"}}}/>;
    case "vcard":
      return <ContactPage fontSize="small" sx={{fontSize: {xs: "14px", md: "18px"}}}/>;
    default:
      return undefined;
  }
};

export const getSourceLabel = (source: Source | string) => {
  switch (source) {
    case 'user':
      return 'User Input';
    case 'linkedin':
      return 'LinkedIn';
    case 'Android Phone':
      return 'Android Phone';
    case 'iPhone':
      return 'iPhone';
    case 'Gmail':
      return 'Gmail';
    case 'GreenCheck':
      return 'GreenCheck';
    case 'vcard':
      return 'vCard';
    default:
      return source;
  }
};