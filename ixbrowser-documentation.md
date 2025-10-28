# IXBrowser API Documentation (compact)

## Overview
IXBrowser API enables programmatic management of browser profiles, including creation, opening, closing, and automation via tools like Selenium or Puppeteer. Base URL: `http://127.0.0.1:53200`. All requests are POST with JSON content.

## Global Notes
- **Authentication**: Not specified; ensure API permissions.
- **Concurrency**: Limited to 3 concurrent requests.
- **Errors**: Common codes include 1000 (permission issues), 2007 (profile not found), etc.

## API Endpoints

### 1. Get Profile List
- **URL**: `/api/v2/profile-list`
- **Description**: Retrieve profiles with optional filters.
- **Request Body**:
  - `profile_id` (int, optional): Profile ID.
  - `name` (str, optional): Profile name.
  - `group_id` (int, optional): Group ID.
  - `tag_id` (int, optional): Tag ID.
  - `page` (int, optional): Page number (default: 1).
  - `limit` (int, optional): Items per page (default: 10).
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}, "data": {"total": int, "data": [profile_objects]}}`
  - Profile object includes `profile_id`, `name`, `group_id`, etc.
- **Errors**: 1008 (permissions restricted).

### 2. Create Profile
- **URL**: `/api/v2/profile-create`
- **Description**: Create a new profile with configurations.
- **Request Body**:
  - `name` (str, required): Profile name.
  - `site_id` (int, optional): Platform ID (default: 22).
  - `site_url` (str, optional): Custom URL if site_id=21.
  - `proxy_config` (obj, optional): Proxy settings (e.g., `proxy_mode`, `proxy_type`).
  - `fingerprint_config` (obj, optional): Browser fingerprint (e.g., `ua_type`, `platform`).
  - `preference_config` (obj, optional): Preferences (e.g., `cookies_backup`).
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}, "data": profile_id}`
- **Notes**: Refer to appendices for enums (e.g., proxy modes, countries).

### 3. Open Profile
- **URL**: `/api/v2/profile-open`
- **Description**: Open a profile for automation.
- **Request Body**:
  - `profile_id` (int, required): Profile ID.
  - `args` (array, optional): Chrome args (e.g., ["--disable-extensions"]).
  - `load_extensions` (bool, optional): Enable extensions.
  - `cookies_backup` (bool, optional): Backup cookies.
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}, "data": {"debugging_address": str, "ws": str, "webdriver": str}}`
- **Errors**: 2007 (profile not found).

### 4. Get Opened Profile
- **URL**: `/api/v2/profile-opened-list`
- **Description**: List currently opened profiles.
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}, "data": [{"profile_id": int, "last_opened_time": str}]}`

### 5. Retrieve Profiles Opened via Local API
- **URL**: `/api/v2/native-client-profile-opened-list`
- **Description**: List profiles opened via API.
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}, "data": [{"profile_id": int, "debugging_address": str, "ws": str}]}`

### 6. Close Profile
- **URL**: `/api/v2/profile-close`
- **Description**: Close an opened profile.
- **Request Body**:
  - `profile_id` (int, required): Profile ID.
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}}`
- **Errors**: 1009 (process not found).

### 7. Close Profiles in Batches
- **URL**: `/api/v2/profile-close-in-batches`
- **Description**: Close multiple profiles.
- **Request Body**:
  - `profile_id` (array, required): List of profile IDs.
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}, "data": [closed_ids]}`

### 8. Get Profile Cookies
- **URL**: `/api/v2/profile-get-cookies`
- **Description**: Retrieve cookies for a profile.
- **Request Body**:
  - `profile_id` (int, required): Profile ID.
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}, "data": "cookie_json_string"}`

### 9. Create Custom Proxy
- **URL**: `/api/v2/proxy-create`
- **Description**: Create a custom proxy.
- **Request Body**:
  - `proxy_type` (str, required): Type (http/https/socks5/ssh).
  - `proxy_ip` (str, required): IP address.
  - `proxy_port` (str, required): Port.
  - `proxy_user` (str, required): Username.
  - `proxy_password` (str, optional): Password.
- **Response**:
  - Success: `{"error": {"code": 0, "message": "success"}, "data": proxy_id}`

## Code Examples
- **Node.js**: Use `ixbRequest` to call APIs and connect via Puppeteer.
- **Python**: Use `IXBrowserClient` with Selenium for automation.

## Appendices (Referenced in Docs)
- **Proxy Modes**: 1 (residential), 2 (custom), 3 (no proxy), 4 (link extraction).
- **Countries**: Use codes like "us", "cn".
- **WebGL Metadata**: Vendor/renderer strings for fingerprinting.
- **Fonts**: List of system fonts for customization.

This structured format allows easy parsing for AI agents. Full details in original doc.
