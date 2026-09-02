# MOKU — Android Build & Release Guide

This guide provides end-to-end instructions for turning the **MOKU** web application into a native Android application using **Capacitor**, compiling debug APKs for local testing, and performing secure production release signing using the **`com.moku.app`** Application ID.

---

## 1. Prerequisites

Ensure your development environment has the following tools installed and configured:

### 1.1 Node.js & Package Manager
- **Node.js**: v18.x or v20.x+ LTS
- **npm**: v9.x or v10.x+

### 1.2 Java Development Kit (JDK)
- **JDK 17** or **JDK 21** (OpenJDK or Temurin recommended).
- Verify installation:
  ```bash
  java -version
  ```

### 1.3 Android Studio & SDK Tools
- Install [Android Studio](https://developer.android.com/studio).
- Open **Android Studio > Settings / Preferences > Languages & Frameworks > Android SDK**:
  - **SDK Platforms**: Install Android 14 (API 34) or Android 15 (API 35).
  - **SDK Tools**:
    - Android SDK Build-Tools (34.x or 35.x)
    - Android SDK Command-line Tools (latest)
    - Android SDK Platform-Tools
    - Android Emulator (if testing without physical hardware)

### 1.4 Environment Variables
Add the Android SDK and Java paths to your shell profile (`~/.bashrc`, `~/.zshrc`, or Windows Environment Variables):

**macOS / Linux:**
```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin
```

**Windows (PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot", "User")
```

---

## 2. Capacitor Configuration

The project is configured with the package identifier **`com.moku.app`**. 

Ensure your `capacitor.config.ts` in the project root looks like this:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moku.app',
  appName: 'MOKU',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#176B52'
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    }
  }
};

export default config;
```

---

## 3. Initializing & Syncing the Android Project

Follow these steps to compile the frontend and generate the native Android container:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build the Production Web Assets
Build the optimized web bundle inside the `dist/` folder:
```bash
npm run build
```

### Step 3: Add the Android Platform
*Only needed once on a fresh clone:*
```bash
npx cap add android
```
This generates the `./android` directory containing the full Gradle project.

### Step 4: Sync Web Assets and Plugins
Whenever you make changes to your frontend code or add new Capacitor plugins:
```bash
npm run build
npx cap sync android
```

---

## 4. Building Debug APKs (Testing & Sideloading)

Debug APKs are unsigned builds meant for rapid installation on physical devices or emulators for testing.

### Option A: Via Command Line (Fastest)

1. Navigate to the `android/` directory:
   ```bash
   cd android
   ```

2. Compile the debug APK using the Gradle wrapper:
   - **macOS / Linux:**
     ```bash
     ./gradlew assembleDebug
     ```
   - **Windows:**
     ```cmd
     gradlew.bat assembleDebug
     ```

3. **Output Location**:
   The generated APK will be available at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Install directly to a connected device via ADB**:
   Ensure USB Debugging is enabled on your device:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

### Option B: Via Android Studio

1. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
2. Wait for Gradle sync to complete.
3. Connect your Android device via USB or start a virtual device (AVD).
4. Click the **Run** button (green play icon) or select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 5. Secure Release Signing Procedures

For production distribution (Google Play Store or secure sideloading), you must sign your APK or Android App Bundle (AAB) with a private cryptographic key.

> ⚠️ **CRITICAL SECURITY RULES**:
> 1. **NEVER** commit keystore files (`*.jks`, `*.keystore`) to Git or version control.
> 2. **NEVER** hardcode keystore passwords in `build.gradle` or any public file.
> 3. Store the master keystore and backup passwords in a secure password manager or hardware vault. If you lose your keystore, you cannot update existing installs on Google Play!

---

### Step 1: Generate a Private Release Keystore

Run the `keytool` utility (included with the JDK) from your terminal:

```bash
keytool -genkey -v \
  -keystore moku-release-key.jks \
  -alias moku-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

- **Keystore Name**: `moku-release-key.jks`
- **Key Alias**: `moku-key-alias`
- **Validity**: `10000` days (~27 years)
- You will be prompted to set a strong password and provide organization details.

> Store `moku-release-key.jks` securely (e.g., in a dedicated secure secrets directory or inside `android/keystore/` which must be git-ignored).

---

### Step 2: Configure Gradle with `key.properties`

To sign builds automatically without exposing credentials:

1. Create a `key.properties` file inside the `android/` folder:
   ```properties
   # android/key.properties (DO NOT COMMIT TO GIT)
   storePassword=YOUR_STRONG_STORE_PASSWORD
   keyPassword=YOUR_STRONG_KEY_PASSWORD
   keyAlias=moku-key-alias
   storeFile=../moku-release-key.jks
   ```
   *(Adjust `storeFile` path relative to `android/app/` or specify an absolute path).*

2. Verify that `key.properties` and `*.jks` are in `.gitignore`:
   ```gitignore
   *.jks
   *.keystore
   key.properties
   ```

3. Update `android/app/build.gradle` to read the signing config securely:

   Open `android/app/build.gradle` and add the `signingConfigs` block:

   ```groovy
   import java.util.Properties

   def keystorePropertiesFile = rootProject.file("key.properties")
   def keystoreProperties = new Properties()
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }

   android {
       namespace "com.moku.app"
       compileSdk rootProject.ext.compileSdkVersion

       defaultConfig {
           applicationId "com.moku.app"
           minSdkVersion rootProject.ext.minSdkVersion
           targetSdkVersion rootProject.ext.targetSdkVersion
           versionCode 1
           versionName "1.0.0"
           testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
       }

       signingConfigs {
           release {
               if (keystorePropertiesFile.exists()) {
                   storeFile file(keystoreProperties['storeFile'])
                   storePassword keystoreProperties['storePassword']
                   keyAlias keystoreProperties['keyAlias']
                   keyPassword keystoreProperties['keyPassword']
               }
           }
       }

       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               shrinkResources true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

---

### Step 3: Build Signed Production Binaries

Navigate to the `android/` directory:
```bash
cd android
```

#### A. Build Android App Bundle (AAB) — Recommended for Google Play
Google Play requires `.aab` format for publishing:
```bash
./gradlew bundleRelease
```
- **Output Artifact**:
  ```
  android/app/build/outputs/bundle/release/app-release.aab
  ```

#### B. Build Signed Release APK — For Direct Sideloading / Website Download
```bash
./gradlew assembleRelease
```
- **Output Artifact**:
  ```
  android/app/build/outputs/apk/release/app-release.apk
  ```

---

### Step 4: Verify APK Signature (Sanity Check)

Verify that your release binary is properly signed with APK Signature Scheme v2/v3:

```bash
apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk
```

Expected output includes:
```text
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Signer #1 certificate DN: CN=MOKU Developer, ...
```

---

## 6. Development Workflow & Live Reload

For rapid iteration without re-building APKs on every change:

1. Find your local IP address (e.g., `192.168.1.50`).
2. Run Capacitor with live reload:
   ```bash
   npx cap run android -l --external
   ```
3. Select your connected device or emulator from the prompt. Any change in `/src` will instantly reload on the device.

---

## 7. Useful Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Build Web Assets** | `npm run build` |
| **Sync Assets & Plugins** | `npx cap sync android` |
| **Open Android Studio** | `npx cap open android` |
| **Build Debug APK (CLI)** | `cd android && ./gradlew assembleDebug` |
| **Build Release AAB (CLI)** | `cd android && ./gradlew bundleRelease` |
| **Build Release APK (CLI)** | `cd android && ./gradlew assembleRelease` |
| **Clean Gradle Build Cache** | `cd android && ./gradlew clean` |
| **Install Debug APK via ADB** | `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` |
| **List Connected ADB Devices** | `adb devices` |

---

## 8. Troubleshooting

### Issue: `JAVA_HOME is not set` or Gradle build fails with Java version mismatch
**Fix**: Ensure JDK 17 is installed and `JAVA_HOME` points to the JDK directory. In Android Studio, check **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK** is set to Java 17.

### Issue: Android licenses not accepted
**Fix**: Run:
```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
```
and accept all prompts with `y`.

### Issue: Assets or UI changes not showing up on Android
**Fix**: You must re-bundle the web app and sync before building:
```bash
npm run build && npx cap sync android
```

### Issue: `key.properties (No such file or directory)` in CI/CD
**Fix**: In continuous integration environments (like GitHub Actions), pass signing keys via environment variables or generate `key.properties` from repository secrets during the build step.
