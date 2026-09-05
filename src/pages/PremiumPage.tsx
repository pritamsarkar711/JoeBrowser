import React from 'react';
import { Typography, Box, Paper, Button, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { CheckCircle, Diamond } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function PremiumPage() {
  const { isPremium, setPremium } = useAppStore();

  return (
    <Box sx={{ maxWidth: 'sm', mx: 'auto', textAlign: 'center', pt: 6 }}>
      <Diamond size={72} color="#2563eb" />
      <Typography variant="h3" sx={{ mt: 3, mb: 2, fontWeight: 800 }}>
        {isPremium ? 'You are Premium!' : 'Upgrade to Premium'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 5, fontSize: '1.1rem' }}>
        {isPremium 
          ? 'Enjoy your ad-free experience across all 50,000+ calculators.' 
          : 'Get the most out of CalcMaster with an uninterrupted, ad-free experience.'}
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 4, sm: 5 }, textAlign: 'left', bgcolor: (t) => isPremium ? (t.palette.mode === 'dark' ? 'primary.900' : 'primary.50') : 'background.paper', borderColor: isPremium ? 'primary.main' : 'divider' }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 800 }}>Premium Benefits</Typography>
        <List disablePadding>
          {['100% Ad-Free Experience', 'Priority Access to New Calculators', 'Save Calculation History', 'Advanced Country-specific Rules'].map((benefit, i) => (
            <ListItem key={i} disableGutters sx={{ py: 1.5 }}>
              <ListItemIcon sx={{ minWidth: 48 }}><CheckCircle size={24} color="#10b981" /></ListItemIcon>
              <ListItemText primary={benefit} primaryTypographyProps={{ fontWeight: 600, fontSize: '1.05rem' }} />
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 5, textAlign: 'center' }}>
          {isPremium ? (
            <Button variant="outlined" color="error" size="large" onClick={() => setPremium(false)} fullWidth sx={{ py: 2, fontWeight: 700, fontSize: '1.1rem' }}>
              Cancel Subscription
            </Button>
          ) : (
            <Button variant="contained" color="primary" size="large" onClick={() => setPremium(true)} fullWidth sx={{ py: 2, fontWeight: 700, fontSize: '1.1rem' }}>
              Subscribe Now - $2.99/mo
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
