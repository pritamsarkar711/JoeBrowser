import React, { useMemo } from 'react';
import { Typography, Grid, Card, CardActionArea, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { calculators } from '../data/calculators';
import { getCategoryIcon, getCalculatorIcon } from '../utils/icons';

export function HomePage() {
  const navigate = useNavigate();

  const categories = useMemo(() => {
    const cats = new Set(calculators.map(c => c.category));
    return Array.from(cats).sort();
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 6, mt: 2 }}>
        <Typography variant="h3" gutterBottom sx={{ color: 'text.primary', fontWeight: 900, fontSize: { xs: '2rem', sm: '3rem' }, letterSpacing: '-0.02em' }}>
          Welcome to CalcMaster
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          Precision calculators for Health, Finance, Math, Physics, and more.
        </Typography>
      </Box>

      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 3, fontWeight: 800 }}>
        Categories
      </Typography>
      <Grid container spacing={3}>
        {categories.map(cat => {
          const count = calculators.filter(c => c.category === cat).length;
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={cat} sx={{ display: 'flex' }}>
              <Card 
                variant="outlined" 
                sx={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 3, borderColor: 'primary.main' }
                }}
              >
                <CardActionArea onClick={() => navigate('/category/' + encodeURIComponent(cat))} sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ p: 1.5, bgcolor: (t) => t.palette.mode === 'dark' ? 'primary.900' : 'primary.50', color: (t) => t.palette.mode === 'dark' ? 'primary.200' : 'primary.main', display: 'flex', mr: 2 }}>
                      {getCategoryIcon(cat)}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{cat}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">{count} Calculators inside</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ mt: 8, mb: 3, fontWeight: 800 }}>
        All Calculators
      </Typography>
      
      <Card variant="outlined" sx={{ mb: 6 }}>
        <List disablePadding>
          {calculators.map((calc, i) => (
            <ListItem disablePadding key={calc.id} divider={i !== calculators.length - 1}>
              <ListItemButton onClick={() => navigate('/calc/' + calc.id)} sx={{ p: 3, '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? 'grey.800' : 'grey.50' }}}>
                <ListItemIcon sx={{ color: 'primary.main' }}>
                  {getCalculatorIcon(calc.id)}
                </ListItemIcon>
                <ListItemText 
                  primary={calc.name} 
                  secondary={calc.category}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: '1.1rem', color: 'text.primary' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Card>
      
      <Box sx={{ mt: 8, p: { xs: 4, md: 6 }, bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>Go Ad-Free with Premium</Typography>
        <Typography sx={{ mb: 4, fontSize: '1.1rem' }}>Unlock an uninterrupted experience without any ads.</Typography>
        <Box component="button" onClick={() => navigate('/premium')} sx={{ bgcolor: 'white', color: 'primary.main', border: 'none', px: 5, py: 2, fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', transition: 'background-color 0.2s', '&:hover': { bgcolor: 'grey.100' }}}>
          Learn More
        </Box>
      </Box>
    </Box>
  );
}
