import {Source} from "@/types/contact";
import {UilCheck, UilGoogle, UilLinkedin, UilUser, UilFileAlt, UilMobileAndroid, UilApple} from "@iconscout/react-unicons";

export const getSourceIcon = (source: Source | string) => {
  const size = 18;
  switch (source) {
    case 'user':
      return <UilUser size={size}/>;
    case 'linkedin':
      return <UilLinkedin size={size}/>;
    case 'Android Phone':
      return <UilMobileAndroid size={size}/>;
    case 'iPhone':
      return <UilApple size={size}/>;
    case "Gmail":
      return <UilGoogle size={size}/>;
    case "GreenCheck":
      return <UilCheck size={size}/>;
    case "vcard":
      return <UilFileAlt size={size}/>;
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