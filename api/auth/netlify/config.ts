
export const CONFIG = {
  // Credentials provided by user
  clientId: process.env.NETLIFY_CLIENT_ID || '0LJFZjCqV3qw90yLeSTqAZMFMvHrIjft5LG-_yS9zdE', 
  clientSecret: process.env.NETLIFY_CLIENT_SECRET || '2HqrSb2BhcyMvVmCQTsTc8LqJW3dG0t8eVmTyn-RCpA',
  tokenUrl: 'https://api.netlify.com/oauth/token',
  authUrl: 'https://app.netlify.com/authorize'
};
