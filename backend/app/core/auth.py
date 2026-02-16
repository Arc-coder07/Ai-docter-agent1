import httpx
import jwt
from jwt import PyJWK
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# Cache for JWKS (Issuer -> Keys)
jwks_cache = {}

async def fetch_jwks(issuer: str) -> dict:
    """Fetch JWKS from issuer using httpx (handles SSL better on macOS)."""
    jwks_url = f"{issuer}/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient(verify=True) as client:
            response = await client.get(jwks_url, timeout=10.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise ValueError(f"Failed to fetch JWKS: {e}")

def get_signing_key(token: str, jwks: dict):
    """Get the correct signing key from JWKS based on token header 'kid'."""
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        if not kid:
            raise ValueError("Token missing 'kid' header")
            
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return PyJWK.from_dict(key).key
                
        raise ValueError(f"Key with kid '{kid}' not found in JWKS")
    except Exception as e:
        raise ValueError(f"Failed to get signing key: {e}")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        # 1. Decode unverified to find Issuer
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        issuer = unverified_payload.get("iss")
        
        if not issuer:
            raise ValueError("Missing 'iss' claim in token")
            
        # 2. Get or Fetch JWKS
        if issuer not in jwks_cache:
            jwks_cache[issuer] = await fetch_jwks(issuer)
            
        jwks = jwks_cache[issuer]
        
        # 3. Get Signing Key
        signing_key = get_signing_key(token, jwks)

        # 4. Verify Signature
        payload = jwt.decode(
            token,
            key=signing_key,
            algorithms=["RS256"],
            options={"verify_exp": True}
        )
        return payload
        
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
