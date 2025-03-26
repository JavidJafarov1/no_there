import { jwtVerify } from 'jose';

const PRIVY_JWKS_URL = 'https://auth.privy.io/api/v1/apps/cm8pvsjsw01vszityct40r9w3/jwks.json';

export const verifyPrivyToken = async (token: string) => {
  try {
    const response = await fetch(PRIVY_JWKS_URL);
    const jwks = await response.json();
    
    const { payload } = await jwtVerify(token, jwks, {
      issuer: 'https://auth.privy.io',
      audience: 'cm8pvsjsw01vszityct40r9w3'
    });

    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}; 