import { Box, Typography, Container } from '@mui/material';

const PostsOffersPage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
          Posts & Offers
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Share posts and view offers from your network.
        </Typography>
      </Box>
    </Container>
  );
};

export default PostsOffersPage;