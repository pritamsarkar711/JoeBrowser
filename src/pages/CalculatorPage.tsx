import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Box, IconButton, TextField, Button, Paper, Divider, Grid } from '@mui/material';
import { ArrowLeft, Play, Info } from 'lucide-react';
import { calculators } from '../data/calculators';
import { useAppStore } from '../store/useAppStore';
import { BlockMath } from 'react-katex';

export function CalculatorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPremium, country } = useAppStore();
  
  const calc = calculators.find(c => c.id === id);
  
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, string | number> | null>(null);

  useEffect(() => {
    if (calc) {
      const initial: Record<string, string> = {};
      calc.inputs.forEach(inp => initial[inp.id] = '');
      setInputs(initial);
      setResult(null);
    }
  }, [calc]);

  if (!calc) return <Typography>Calculator not found.</Typography>;

  const handleCalculate = () => {
    const numInputs: Record<string, number> = {};
    let valid = true;
    calc.inputs.forEach(inp => {
      const val = parseFloat(inputs[inp.id]);
      if (isNaN(val)) valid = false;
      numInputs[inp.id] = val;
    });

    if (!valid) {
      alert('Please enter valid numbers in all fields.');
      return;
    }

    try {
      const res = calc.logic(numInputs);
      setResult(res);
    } catch (e) {
      console.error(e);
      alert('Error in calculation.');
    }
  };

  const hasEmptyInputs = Object.values(inputs).some(v => v.trim() === '');

  return (
    <Box sx={{ maxWidth: 'xl', mx: 'auto', mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate(-1)} size="large" sx={{ borderRadius: 0 }}>
          <ArrowLeft />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{calc.name}</Typography>
      </Box>

      {!isPremium && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'grey.300', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Advertisement Space</Typography>
        </Paper>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>
              {calc.category} Calculator
            </Typography>

            <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); handleCalculate(); }} sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {calc.inputs.map(inp => (
                <TextField
                  key={inp.id}
                  label={inp.label}
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={inputs[inp.id] || ''}
                  onChange={(e) => setInputs(prev => ({ ...prev, [inp.id]: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              ))}

              <Button
                variant="contained"
                size="large"
                color="primary"
                onClick={handleCalculate}
                disabled={hasEmptyInputs}
                startIcon={<Play size={18} />}
                sx={{ py: 2, mt: 2, fontSize: '1.1rem', fontWeight: 700 }}
              >
                Calculate
              </Button>
            </Box>

            {result && (
              <Box sx={{ mt: 5 }}>
                <Divider sx={{ mb: 4 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>Result:</Typography>
                <Box sx={{ bgcolor: 'primary.50', p: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                  {Object.entries(result).map(([key, val]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, '&:last-child': { mb: 0 }}}>
                      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{key}</Typography>
                      <Typography variant="body1" color="primary.main" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{val}</Typography>
                    </Box>
                  ))}
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 2 }}>
                  Calculated based on {country} regional defaults where applicable.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Info size={20} color="#64748b" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Formula & Logic</Typography>
            </Box>
            
            <Box sx={{ mb: 4, overflowX: 'auto', p: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'grey.200' }}>
              <BlockMath math={calc.formula} />
            </Box>

            <Typography variant="subtitle2" color="text.primary" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Example Calculation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {calc.example}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
