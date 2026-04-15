export const CLIENT_ID = "d39ba9916b7251055b22c7f910e2ea796ee65e98b2ddecea8f5dde8d9d1a815d";

export const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15",
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: "https://www.icloud.com"
};

export const AUTH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15",
    Accept: "*/*",
    "Content-Type": "application/json",
    Origin: "https://www.icloud.com",
    Referer: "https://www.icloud.com/",
    "X-Apple-Widget-Key": CLIENT_ID,
    "X-Apple-OAuth-Client-Id": CLIENT_ID,
    "X-Apple-OAuth-Client-Type": "firstPartyAuth",
    "X-Apple-OAuth-Redirect-URI": "https://www.icloud.com",
    "X-Apple-OAuth-Require-Grant-Code": "true",
    "X-Apple-OAuth-Response-Type": "code",
    "X-Apple-OAuth-Response-Mode": "web_message",
};

export const AUTH_ENDPOINT = "https://idmsa.apple.com/appleauth/auth/";
export const BASE_ENDPOINT = "https://www.icloud.com/";
export const SETUP_ENDPOINT = "https://setup.icloud.com/setup/ws/1/accountLogin";
