import { ImportContacts } from "@/components/contacts/ImportContacts/ImportContacts";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {GOOGLE_CLIENT_ID} from "@/config/google";

const ImportPage = () => {
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <ImportContacts/>
  </GoogleOAuthProvider>;
};

export default ImportPage;