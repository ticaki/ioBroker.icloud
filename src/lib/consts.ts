export const CLIENT_ID = 'd39ba9916b7251055b22c7f910e2ea796ee65e98b2ddecea8f5dde8d9d1a815d';

// The SRP endpoint (idmsa.apple.com/appleauth/auth/signin/init+complete) requires a browser-like UA.
// The plain-password endpoint (/signin) and setup.icloud.com require the python-requests UA.
// Using the wrong UA causes 404 (SRP) or 503 (plain password) respectively.
const CHROME_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
const PYICLOUD_USER_AGENT = 'python-requests/2.31.0';

// Used for setup.icloud.com calls (accountLogin, validate, etc.)
export const DEFAULT_HEADERS = {
    'User-Agent': PYICLOUD_USER_AGENT,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: 'https://www.icloud.com',
    Referer: 'https://www.icloud.com/',
};

// Used for SRP auth calls (idmsa.apple.com/appleauth/auth/signin/init+complete)
// Requires browser-like UA — python-requests UA gets 404 from this endpoint.
export const AUTH_HEADERS = {
    'User-Agent': CHROME_USER_AGENT,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: 'https://www.icloud.com',
    Referer: 'https://www.icloud.com/',
    'X-Apple-Widget-Key': CLIENT_ID,
    'X-Apple-OAuth-Client-Id': CLIENT_ID,
    'X-Apple-OAuth-Client-Type': 'firstPartyAuth',
    'X-Apple-OAuth-Redirect-URI': 'https://www.icloud.com',
    'X-Apple-OAuth-Require-Grant-Code': 'true',
    'X-Apple-OAuth-Response-Type': 'code',
    'X-Apple-OAuth-Response-Mode': 'web_message',
};

export const AUTH_ENDPOINT = 'https://idmsa.apple.com/appleauth/auth/';
export const BASE_ENDPOINT = 'https://www.icloud.com/';
export const SETUP_ENDPOINT = 'https://setup.icloud.com/setup/ws/1/accountLogin';
