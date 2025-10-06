import React, { useEffect, useState } from 'react';
import { Box, Fade } from '@mui/material';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'fadeIn' | 'fadeOut'>('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('fadeIn');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Fade
        in={transitionStage === 'fadeIn'}
        timeout={200}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'auto'
          }}
        >
          {children}
        </Box>
      </Fade>
    </Box>
  );
};

export default PageTransition;