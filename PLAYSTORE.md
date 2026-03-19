# Prepare Shoten AI for Google Play Store

This guide walks you through building and submitting **Shoten AI** to the Google Play Store.

---

## 1. Prerequisites

### Google Play Developer account
- Go to [Google Play Console](https://play.google.com/console) and sign up.
- One-time **registration fee** (about $25).
- You’ll need a Google account and identity verification.

### Expo account (for EAS Build)
- Create an account at [expo.dev](https://expo.dev) if you don’t have one.
- Install EAS CLI and log in:

```bash
npm install -g eas-cli
eas login
```

### Package name
- Your app is configured with **`com.shotenai.app`** in `app.json`.
- This must be **unique** in the Play Store. If you prefer another (e.g. `com.yourcompany.shotenai`), change `expo.android.package` in `app.json` **before** creating the app in Play Console. You cannot change it later.

---

## 2. Build the Android App Bundle (AAB)

Play Store requires an **Android App Bundle (AAB)**, not APK. EAS Build produces this.

From the **`record_app`** folder:

```bash
cd record_app
eas build --platform android --profile production
```

- First time: EAS will ask to create a project and link it; accept.
- Build runs in the cloud (about 10–20 minutes).
- When done, you get a **download link** for the `.aab` file. Download it; you’ll upload this in Play Console.

**Optional – test with APK first:**  
Use the `preview` profile to get an APK for testing:

```bash
eas build --platform android --profile preview
```

---

## 3. Create the app in Play Console

1. Open [Google Play Console](https://play.google.com/console).
2. Click **Create app**.
3. Fill in:
   - **App name:** Shoten AI  
   - **Default language**  
   - **App or game:** App  
   - **Free or paid:** Free (or Paid if you charge)
4. Accept declarations (e.g. policies, export laws).
5. Create the app. You’ll land on the app dashboard.

---

## 4. Complete required Play Console setup

Before you can publish, you must complete the items in the dashboard checklist.

### 4.1 Store listing
- **Short description** (up to 80 characters).
- **Full description** (up to 4000 characters).
- **App icon:** 512×512 px PNG (no transparency).
- **Feature graphic:** 1024×500 px (optional but recommended).
- **Screenshots:** At least 2 phone screenshots (e.g. 1080×1920 or similar).

### 4.2 Content rating
- In the left menu: **Policy** → **App content** → **Content rating**.
- Start questionnaire, choose category (e.g. “Utilities” or “Productivity”), answer questions.
- Submit and get your rating (e.g. Everyone, Teen).

### 4.3 Privacy policy
- If your app collects any data (e.g. recordings, account info), you **must** have a **public privacy policy URL**.
- Add it under **Policy** → **App content** → **Privacy policy**.
- Host the page on your website or use a free host (e.g. GitHub Pages, Notion public page).

### 4.4 App access
- If all features are in the app with no special login, you can state “All functionality is available without restrictions.”
- If you have login or special access, provide instructions or a test account.

### 4.5 Ads (if applicable)
- If the app shows ads, declare it in **App content** → **Ads**. If no ads, select “No.”

### 4.6 Target audience and content
- Set **target age groups** and complete the **target audience and content** form as required.

---

## 5. Upload the AAB and release

1. In Play Console, go to **Release** → **Production** (or **Testing** → **Internal testing** to test first).
2. **Create new release**.
3. **Upload** the `.aab` you downloaded from EAS.
4. Add **Release name** (e.g. “1.0.0 (1)”) and **Release notes** (what’s new for users).
5. **Save** and then **Review release**.
6. If everything is green, **Start rollout to Production** (or to your test track).

---

## 6. Future updates

- Bump **version** in `app.json`: e.g. `"version": "1.0.1"`.
- Bump **versionCode** in `app.json` under `expo.android`: e.g. `"versionCode": 2`. It must **always increase** (e.g. 2, 3, 4…) for each new upload.
- Build again and upload the new AAB:

```bash
eas build --platform android --profile production
```

Then create a new release in the same track and upload the new `.aab`.

---

## 7. Optional: Submit from the command line (EAS Submit)

After you’ve set up a **service account** in Google Play Console and downloaded the JSON key:

1. Save the key as `google-service-account.json` in the **`record_app`** folder (do **not** commit this file; add it to `.gitignore`).
2. Submit the latest production build:

```bash
eas submit --platform android --profile production --latest
```

EAS will use the key to upload the AAB to the release track you configured. You can also upload the AAB manually in Play Console instead.

---

## Checklist before first submission

- [ ] Google Play Developer account created
- [ ] Expo account + `eas login`
- [ ] Package name `com.shotenai.app` (or your choice) set in `app.json` and used when creating the app in Play Console
- [ ] Production AAB built: `eas build --platform android --profile production`
- [ ] App created in Play Console with same package name
- [ ] Store listing (short + full description, icon, screenshots)
- [ ] Content rating completed
- [ ] Privacy policy URL added (if you collect data)
- [ ] App access / ads / target audience sections completed
- [ ] AAB uploaded to a release (e.g. Internal testing first, then Production)

Once the first release is rolled out, it can take from a few hours to a few days for the app to appear on the Play Store, depending on review.
