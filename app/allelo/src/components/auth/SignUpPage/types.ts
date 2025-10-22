export interface SignUpFormData {
  email: string;
  password: string;
  pin: string;
  agreedToContract: boolean;
}

export interface SignUpFormProps {
  formData: SignUpFormData;
  errors: Record<string, string>;
  showPassword: boolean;
  onFormDataChange: (field: keyof SignUpFormData, value: string | boolean) => void;
  onShowPasswordToggle: () => void;
}

export interface AccountVerificationProps {
  agreedToContract: boolean;
  contractError?: string;
  onAgreementChange: (agreed: boolean) => void;
  onContractDetailsClick: () => void;
}