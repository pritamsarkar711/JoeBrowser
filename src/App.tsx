import React, { useMemo, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, BottomNavigation, BottomNavigationAction, InputBase, Paper, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, MenuItem, Select, Button, Dialog, DialogContent, Avatar } from '@mui/material';
import { Search, Home, LayoutGrid as Category, Diamond, Menu as MenuIcon, ArrowLeft, Moon, Sun } from 'lucide-react';
import { getTheme } from './theme';
import { useAppStore } from './store/useAppStore';
import { countries } from './data/countries';
import { calculators } from './data/calculators';
import { getCalculatorIcon } from './utils/icons';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { PremiumPage } from './pages/PremiumPage';

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const results = useMemo(() => {
    if (!query) return calculators;
    const lower = query.toLowerCase();
    return calculators.filter(c => c.name.toLowerCase().includes(lower) || c.category.toLowerCase().includes(lower));
  }, [query]);

  return (
    <Dialog fullScreen open={open} onClose={onClose} transitionDuration={200}>
      <AppBar position="sticky" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <ArrowLeft />
          </IconButton>
          <InputBase
            sx={{ ml: 2, flex: 1, fontSize: '1.1rem' }}
            placeholder="Search 100+ calculators..."
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Toolbar>
      </AppBar>
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        <List sx={{ pt: 0 }}>
          {results.length === 0 ? (
            <Box p={4} textAlign="center"><Typography color="text.secondary">No calculators found for "{query}"</Typography></Box>
          ) : (
            results.map((c) => (
              <ListItem disablePadding key={c.id}>
                <ListItemButton 
                  onClick={() => {
                    navigate('/calc/' + c.id);
                    onClose();
                  }}
                  sx={{ py: 2, borderBottom: '1px solid', borderColor: 'grey.100' }}
                >
                  <ListItemIcon sx={{ color: 'primary.main' }}>
                    {getCalculatorIcon(c.id)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={c.name} 
                    secondary={c.category} 
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { country, setCountry, isPremium, setSearchOpen, isDarkMode, setDarkMode } = useAppStore();
  const navigate = useNavigate();

  return (
    <AppBar position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, borderBottom: '1px solid', borderColor: 'grey.200' }}>
      <Toolbar sx={{ display: 'flex', gap: 2 }}>
        <IconButton edge="start" onClick={onMenuClick} sx={{ display: { sm: 'none' }, borderRadius: 0 }}>
          <MenuIcon />
        </IconButton>
        
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Box component="img" src="/logo.png" sx={{ height: 32, width: 32, mr: 1.5 }} />
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, color: 'primary.main', display: { xs: 'none', sm: 'block' } }}>
            CalcMaster
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <IconButton onClick={() => setDarkMode(!isDarkMode)} sx={{ borderRadius: 0 }}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </IconButton>

        <IconButton onClick={() => setSearchOpen(true)} sx={{ borderRadius: 0, bgcolor: isDarkMode ? 'grey.800' : 'grey.50', '&:hover': { bgcolor: isDarkMode ? 'grey.700' : 'grey.200' } }}>
          <Search size={20} />
        </IconButton>

        <Select
          size="small"
          value={country}
          onChange={(e) => setCountry(e.target.value as string)}
          sx={{ minWidth: 140, display: { xs: 'none', sm: 'flex' }, borderRadius: 0 }}
          renderValue={(selected) => {
            const c = countries.find(x => x.code === selected);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={`https://flagcdn.com/w40/${c?.code.toLowerCase()}.png`} sx={{ width: 20, height: 20, mr: 1, borderRadius: '50%' }} />
                {c?.name}
              </Box>
            )
          }}
        >
          {countries.map((c) => (
            <MenuItem key={c.code} value={c.code}>
              <Avatar src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} sx={{ width: 24, height: 24, mr: 2, borderRadius: '50%' }} />
              {c.name}
            </MenuItem>
          ))}
        </Select>

        {!isPremium && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Diamond size={18} />}
            onClick={() => navigate('/premium')}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Premium
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { country, setCountry, isPremium } = useAppStore();

  const drawerWidth = 260;
  
  const content = (
    <Box sx={{ overflow: 'auto', mt: 8, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <List>
        <ListItem disablePadding>
          <ListItemButton selected={location.pathname === '/'} onClick={() => { navigate('/'); onClose(); }}>
            <ListItemIcon><Home size={22} /></ListItemIcon>
            <ListItemText primary="Home" primaryTypographyProps={{ fontWeight: location.pathname === '/' ? 700 : 500 }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => { navigate('/premium'); onClose(); }}>
            <ListItemIcon><Diamond size={22} color={isPremium ? 'green' : 'gray'} /></ListItemIcon>
            <ListItemText primary={isPremium ? "Premium Active" : "Get Premium"} />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 3, display: { xs: 'block', sm: 'none' }, borderTop: '1px solid', borderColor: 'grey.200' }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Your Region</Typography>
        <Select
          fullWidth
          size="small"
          value={country}
          onChange={(e) => setCountry(e.target.value as string)}
          sx={{ mt: 1, borderRadius: 0 }}
          renderValue={(selected) => {
            const c = countries.find(x => x.code === selected);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={`https://flagcdn.com/w40/${c?.code.toLowerCase()}.png`} sx={{ width: 20, height: 20, mr: 1, borderRadius: '50%' }} />
                {c?.name}
              </Box>
            )
          }}
        >
          {countries.map((c) => (
            <MenuItem key={c.code} value={c.code}>
              <Avatar src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} sx={{ width: 24, height: 24, mr: 2, borderRadius: '50%' }} />
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRadius: 0 } }}
      >
        {content}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'grey.200', borderRadius: 0 },
        }}
        open
      >
        {content}
      </Drawer>
    </>
  );
}

function Layout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { searchOpen, setSearchOpen } = useAppStore();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar onMenuClick={() => setMobileOpen(!mobileOpen)} />
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 4 }, mt: 8, pb: { xs: 10, sm: 4 } }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:cat" element={<CategoryPage />} />
          <Route path="/calc/:id" element={<CalculatorPage />} />
          <Route path="/premium" element={<PremiumPage />} />
        </Routes>
      </Box>

      {/* Bottom Nav for mobile */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: { sm: 'none' }, zIndex: 1000, borderRadius: 0 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={location.pathname === '/' ? 0 : location.pathname.startsWith('/category') ? 1 : location.pathname === '/premium' ? 2 : -1}
          onChange={(event, newValue) => {
            if (newValue === 0) navigate('/');
            if (newValue === 1) navigate('/'); // Or a dedicated category index
            if (newValue === 2) navigate('/premium');
          }}
        >
          <BottomNavigationAction label="Home" icon={<Home size={24} />} />
          <BottomNavigationAction label="Categories" icon={<Category size={24} />} />
          <BottomNavigationAction label="Premium" icon={<Diamond size={24} />} />
        </BottomNavigation>
      </Paper>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
}

export default function App() {
  const { setCountry, isDarkMode } = useAppStore();

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes('America/New_York')) setCountry('US');
      if (tz.includes('Europe/London')) setCountry('GB');
      if (tz.includes('Asia/Dhaka')) setCountry('BD');
      if (tz.includes('Asia/Calcutta')) setCountry('IN');
    } catch (e) {}
  }, [setCountry]);

  const activeTheme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  return (
    <ThemeProvider theme={activeTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </ThemeProvider>
  );
}
