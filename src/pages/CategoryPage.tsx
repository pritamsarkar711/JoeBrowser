import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Card, Box, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { calculators } from '../data/calculators';
import { getCalculatorIcon } from '../utils/icons';

export function CategoryPage() {
  const { cat } = useParams<{ cat: string }>();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(cat || '');
  
  const categoryCalculators = useMemo(() => {
    return calculators.filter(c => c.category === categoryName);
  }, [categoryName]);

  if (!categoryName || categoryCalculators.length === 0) {
    return <Typography>Category not found.</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, mt: 2 }}>
        <IconButton onClick={() => navigate(-1)} size="large" sx={{ borderRadius: 0, '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? 'grey.700' : 'grey.100' } }}>
          <ArrowLeft />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{categoryName} Calculators</Typography>
      </Box>

      <Card variant="outlined">
        <List disablePadding>
          {categoryCalculators.map((calc, i) => (
            <ListItem disablePadding key={calc.id} divider={i !== categoryCalculators.length - 1}>
              <ListItemButton onClick={() => navigate('/calc/' + calc.id)} sx={{ p: 3, '&:hover': { bgcolor: (t) => t.palette.mode === 'dark' ? 'grey.800' : 'grey.50' } }}>
                <ListItemIcon sx={{ color: 'primary.main' }}>
                  {getCalculatorIcon(calc.id)}
                </ListItemIcon>
                <ListItemText 
                  primary={calc.name} 
                  primaryTypographyProps={{ fontWeight: 600, fontSize: '1.1rem', color: 'text.primary' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Card>
    </Box>
  );
}
