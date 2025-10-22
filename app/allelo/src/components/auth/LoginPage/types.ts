export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormProps {
  formData: LoginFormData;
  errors: Record<string, string>;
  showPassword: boolean;
  onFormDataChange: (field: keyof LoginFormData, value: string) => void;
  onShowPasswordToggle: () => void;
}