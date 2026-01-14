import {
  Box,
  Typography,
  Paper,
  Button,
  Checkbox,
  FormControlLabel,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  UilUsersAlt as UilHandshake,
  UilUsersAlt,
  UilShareAlt,
  UilChartLine,
  UilShieldCheck,
} from '@iconscout/react-unicons';
import { useNavigate } from 'react-router-dom';

export const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const handleSubmit = async () => {
    
    navigate('/');
    
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: {xs:1, md: 2}
      }}
    >
      <Paper
        elevation={2}
        sx={{
          m: 0,
          width: '100%',
          maxWidth: { xs: 480, md: 640 },
          p: { xs: 2, sm: 4, md: 5 },
          borderRadius: 3,
          backgroundColor: 'background.paper'
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <UilHandshake size="48" color="currentColor" style={{ color: 'var(--mui-palette-primary-main)' }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mt:2, mb: 2,
              color: 'text.primary'
            }}
          >
            Allelo PNM prototype
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Privacy Policy
          </Typography>
        </Box>

        {/* Social Contract Summary */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Effective Date: 12 January 2026
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            NAO COOPERATIVE is committed to protecting the privacy of our users and customers. This privacy policy explains how we collect, use, share, and protect personal information in accordance with the General Data Protection Regulation (GDPR).
          </Typography>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Data Controller, DPO, and Contact
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • <b>Data Controller:</b> NAO COOPERATIVE CAPITAL, Inc
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Data Protection Officer (DPO):</b> Ruben Daniels
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Email:</b> ruben.d@allelo.eco
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Data Collection
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We collect personal data when you visit our website, use our services, or interact with us. This may include:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • <b>Preferences and user feedback</b> We collect feedback from surveys or product reviews that you provide to help us improve our products and services.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Usage data and cookies</b> We use cookies (localStorage) to store your encrypted vault.
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Purpose of Processing
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your data is processed for the following purposes:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • <b>To provide and improve our services</b> We use your data to manage your account, process orders, and enhance our website features. If you sign up for an account, we use your data to personalize your shopping experience and ensure faster checkout.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>For marketing purposes, with your consent</b> We may send you promotional emails about new products or discounts if you have opted in to receive marketing communications. You can withdraw your consent at any time.
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Legal Basis for Processing
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We process your personal data based on the following legal grounds:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • <b>Your consent</b> If you subscribe to our newsletter, we process your email address based on your consent. You can withdraw consent at any time by unsubscribing.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Our legitimate business interests</b> We may process your data to analyze customer behavior and improve our product offerings or website performance. This helps us provide you with better services and tailor our marketing efforts.
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Data Transfer Outside the EU
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            In some cases, we may need to transfer your personal data to countries outside the European Union (EU) or the European Economic Area (EEA). These transfers may occur when our service providers or partners are located in countries outside of the EU/EEA or when we need to store or process data in global data centers. We ensure that any such transfer of your personal data is carried out in compliance with applicable data protection laws, including the General Data Protection Regulation (GDPR). To safeguard your data during these transfers, we rely on standard contractual clauses or other appropriate safeguards, ensuring that your data is protected in accordance with GDPR standards.
          </Typography>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Use of Cookies and Other Trackers
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Our website uses cookies and similar tracking technologies to improve your browsing experience, understand how you use our site. You can manage your cookie preferences through your browser settings.
          </Typography>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Data Subject Rights
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Under GDPR, you have the right to:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • <b>Access your personal data</b> You can request a copy of all the personal information we hold about you, such as your account details and preferences.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Rectify incorrect data</b> If you notice an error in your personal details (like a misspelled name or incorrect address), you can request that we correct it.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Erase your data in certain circumstances</b> You can request the deletion of your account data if you no longer wish to use our services or if your data is no longer necessary for the purposes it was collected.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Restrict or object to processing</b> If you believe your data is being processed unlawfully or if you no longer wish to receive marketing emails, you can request that we restrict or stop processing your personal data.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Data portability</b> You can request a copy of your data in a machine-readable format, which can be transferred to another service provider.
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Data Security
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We take appropriate measures to ensure data security, protect against unauthorized access, and comply with GDPR.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • <b>Technical Measures</b>  We use encryption for payment transactions and secure your personal account data with multi-factor authentication.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Organizational Measures</b>  Our employees and contractors are trained on GDPR requirements, and access to your personal data is restricted to those who need it to perform their roles.
            </Typography>
          </Box>
          
          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Data Retention
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Personal data is retained as long as necessary for the purposes stated, unless a longer retention period is required or permitted by law.
          </Typography>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Changes to this Policy
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We may update this policy. We will notify you of significant changes and update the “last updated” date at the top of the policy.
          </Typography>

          <Typography variant="h6" sx={{ mt:2, mb: 2, fontWeight: 600 }}>
            Contact Us
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            For questions or to exercise your data protection rights, please contact us at:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • <b>Data Controller</b> NAO COOPERATIVE CAPITAL, Inc
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>Email</b> ruben.d@allelo.eco
            </Typography>
          </Box>

        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmit}
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Go back to home page
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};