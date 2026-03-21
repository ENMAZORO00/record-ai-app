# Shoten AI – Investor Demo on Mobile

This guide helps you run **Shoten AI** on your phone and connect it to your **Azure backend** for investor demos. No Play Store submission required.

---

## 1. Prerequisites

- **Azure backend** deployed and reachable (e.g. `https://your-app.azurewebsites.net` or your custom domain)
- **Expo account** – sign up at [expo.dev](https://expo.dev)
- **EAS CLI** – if not installed:

```bash
npm install -g eas-cli
eas login
```

- **Android device** for testing (iOS needs Apple Developer account)

---

## 2. Point the App to Your Azure Backend

The app reads the API URL from `EXPO_PUBLIC_API_URL`.

### 2.1 Create/update `.env` in `record_app`

Create or edit `.env` in the **`record_app`** folder:

```bash
# Replace with your actual Azure backend URL (must be HTTPS in production)
EXPO_PUBLIC_API_URL=https://your-app-name.azurewebsites.net

# If using Google Sign-In, keep your client ID
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Use your real Azure URL, e.g.:
- `https://shoten-backend.azurewebsites.net`
- `https://api.shotenai.com` (if you have a custom domain)

For **EAS cloud APK/AAB builds**, also configure the URL as in **§3** (`eas.json` or Expo dashboard)—`.env` alone is often not enough.

### 2.2 Backend requirements (Azure)

1. **CORS** – Backend must allow requests from your app. For mobile, you often need to allow your API origin (e.g. `https://your-app.azurewebsites.net`). If you use `*` for development, ensure it’s safe for demo.
2. **HTTPS** – Mobile apps on the internet require HTTPS; Azure App Service provides this by default.

---

## 3. Backend URL inside the APK (EAS cloud builds)

The app reads `EXPO_PUBLIC_API_URL` from `src/constants/config.js`. Expo **inlines** `EXPO_PUBLIC_*` variables when the JavaScript bundle is built, so the URL is **fixed inside the APK at build time**—you cannot change it after install without rebuilding.

### 3.1 Why `.env` alone may not work on EAS cloud

In this project, **`.env` is listed in `.gitignore`**. EAS cloud builds usually upload **only files tracked by Git**, so **`.env` is often not sent** to the build server. Your APK might still point at `localhost` if you only set the URL locally in `.env`.

For cloud builds, use one of the options below.

### 3.2 Option A – `eas.json` (simple for a public API URL)

Add an `env` block to the build profile you use (e.g. `preview` for APK demos, `production` for Play Store):

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  },
  "env": {
    "EXPO_PUBLIC_API_URL": "https://your-app.azurewebsites.net"
  }
}
```

Use your real Azure URL, **HTTPS**, **no trailing slash**. Add the same `env` key under `production` if the store build should use Azure.

Then rebuild:

```bash
eas build --platform android --profile preview
```

### 3.3 Option B – Expo dashboard environment variables

1. Open [expo.dev](https://expo.dev) → your project → **Environment variables**.
2. Add **Name:** `EXPO_PUBLIC_API_URL`  
   **Value:** `https://your-app.azurewebsites.net`  
3. Attach it to the right **environment** (e.g. **preview** / **production**) for your EAS profiles.
4. Run `eas build` again so the new value is baked in.

### 3.4 Option C – Local `.env` (limited cases)

- **`eas build --local`** on your machine can pick up `.env` if present in `record_app`.
- Relying on `.env` for **default cloud** EAS builds is unreliable unless that file is included in what gets uploaded (not the case when it’s gitignored).

### 3.5 Google client ID in the APK

If you need **Continue with Google** in the built app, set **`EXPO_PUBLIC_GOOGLE_CLIENT_ID`** the same way (`eas.json` `env` or Expo dashboard), not only in `.env`, for cloud builds.

---

## 4. Build an APK and Install on Your Phone

This gives you a standalone APK you can sideload on your Android device.

### 4.1 Build the APK

From the **`record_app`** folder:

```bash
cd record_app
eas build --platform android --profile preview
```

- First run: EAS may ask to create a project and link it; accept.
- Build runs in the cloud (~10–20 minutes).
- When done, you get a **download link** for the `.apk` file.

### 4.2 Install on your phone

1. **Download** the APK on your phone (from the link in the EAS build page) or transfer it from your computer.
2. **Enable “Install from unknown sources”** (Android):
   - Settings → Security → Unknown sources (or “Install unknown apps” per app)
   - Allow installation from your browser or file manager.
3. **Open the APK** and tap **Install**.
4. Launch **Shoten AI** and test signup, login, recording, etc.

---

## 5. Alternative: Run on Device via USB (Development)

For fast iteration during development:

### 5.1 Install dependencies

- [Android Studio](https://developer.android.com/studio) with Android SDK
- [Node.js](https://nodejs.org)

### 5.2 Start Metro and run on device

```bash
cd record_app
npm install
npx expo start
```

Then:

- Connect your phone via USB with **USB debugging** enabled.
- Press `a` in the terminal to run on Android, or scan the QR code with Expo Go (if compatible).

For a full development build (when Expo Go is not enough):

```bash
npx expo run:android
```

This builds and installs the app directly on the connected device. Ensure `.env` has your Azure URL before running.

---

## 6. Demo Day Checklist

Before showing the app to investors:

- [ ] Azure backend is live and responding (e.g. `curl https://your-backend.azurewebsites.net/health` or similar)
- [ ] **`EXPO_PUBLIC_API_URL`** is set for the build you use: **`eas.json` → `env`** and/or Expo **Environment variables** (cloud EAS), or `.env` for local dev / `eas build --local`
- [ ] APK built with `eas build --platform android --profile preview`
- [ ] APK installed on your phone and tested end-to-end
- [ ] Test accounts ready (signup/login, or demo credentials)
- [ ] Phone charged and on a stable Wi‑Fi or cellular connection
- [ ] Microphone permission granted for recording

---

## 7. Troubleshooting

### “Network request failed” or connection errors

- Confirm `EXPO_PUBLIC_API_URL` uses **HTTPS** and no trailing slash.
- Verify the backend URL is reachable from a browser on your phone.
- Check Azure CORS settings.

### Build uses wrong or old API URL

- Env vars are baked in at **build time**. After changing the URL, run **`eas build`** again.
- For **cloud** EAS builds, set `EXPO_PUBLIC_API_URL` in **`eas.json` → `env`** or in the **Expo dashboard**—don’t rely only on `.env` (it’s gitignored and often not uploaded). See **§3**.

### Google Sign-In not working

- In Google Cloud Console, add the correct OAuth client for Android (package: `com.shotenai.app`, SHA‑1 from your keystore).
- Ensure `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set in **`eas.json` / Expo env** for release APKs, not only in `.env` (see **§3.5**).

---

## 8. Next Step: Play Store

When you’re ready for the store, follow **`PLAYSTORE.md`** to build an AAB and submit to the Google Play Store.
