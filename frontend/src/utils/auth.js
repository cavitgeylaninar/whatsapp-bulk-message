// Authentication utilities
export const saveToken = (token) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    // Decode JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch (error) {
    console.error('Invalid token:', error);
    return false;
  }
};

export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

// For testing - to be removed in production
export const setTestToken = () => {
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmZmJmNDhjLWRlZWItNGZmOS1hZmY2LWM0YTAxYTQ3ZDgwNSIsImVtYWlsIjoiY2F2aXRAZXhhbXBsZS5jb20iLCJyb2xlIjoiYmF5aSIsImlhdCI6MTc1NjkxODIzMCwiZXhwIjoxNzU3MDA0NjMwfQ.gO161LRx761ThQ9RM4QGXptd6NZ82A-ANAc4blzFTsM';
  saveToken(testToken);
  console.log('Test token set for cavit@example.com');
  return testToken;
};