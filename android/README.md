# Nyuwe Zambia — Android app (Trusted Web Activity)

Packages the deployed PWA (`https://tonse-web.onrender.com`) as a native Android
app. The TWA runs the real site full-screen (no browser chrome), Web Push keeps
working, and — because there is now a **native layer** — the app can additionally
draw a **floating bubble over other apps**, which a plain web page can never do.

This folder holds the Bubblewrap project config (`twa-manifest.json`). The actual
Android project + APK are generated on a machine with a JDK/Android SDK (Bubblewrap
offers to install both).

---

## 1. Build the base TWA

```bash
npm i -g @bubblewrap/cli
cd android
bubblewrap init --manifest https://tonse-web.onrender.com/manifest.webmanifest
#   → answer prompts (it reads defaults from ./twa-manifest.json)
#   → it CREATES ./android.keystore on first run — BACK IT UP; losing it
#     means you can never update the app on Play.
bubblewrap build
#   → app-release-signed.apk (sideload/test) + app-release-bundle.aab (Play upload)
```

Install on a connected phone: `bubblewrap install` (or `adb install app-release-signed.apk`).

## 2. Digital Asset Links (removes the browser bar)

The site must prove it trusts the app. The template is already served at
`https://tonse-web.onrender.com/.well-known/assetlinks.json` — it needs the real
signing-cert fingerprint:

```bash
keytool -list -v -keystore android.keystore -alias android
#   → copy the SHA-256 line, e.g. AA:BB:CC:...
```

Paste it into `public/.well-known/assetlinks.json` (replacing
`REPLACE_WITH_SIGNING_CERT_SHA256`), commit, deploy the frontend, then verify:

```
https://developers.google.com/digital-asset-links/tools/generator
```

> Publishing on Play with **Play App Signing**? Play re-signs the app — add
> Play's certificate SHA-256 (Play Console → Setup → App integrity) to the
> fingerprints array too (it accepts multiple entries).

## 3. Floating bubble over other apps

Two native paths. **Bubbles is the Play-compliant default; the overlay is the
"always visible" hammer.** Both are launchers — live inquiry counts stay in the
PWA + push notifications; the bubble's job is to reopen Nyuwe instantly.

### Option A (recommended): Android Bubbles API — no special permission

Android 11+. A notification with `BubbleMetadata` floats as a chat-head the user
can keep on screen; tapping expands the TWA. Play-policy safe.

```kotlin
// In the TWA project (e.g. app/src/main/java/.../BubbleHelper.kt)
val target = Intent(context, LauncherActivity::class.java) // the TWA activity
val bubbleIntent = PendingIntent.getActivity(
    context, 0, target, PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
)

val bubbleData = NotificationCompat.BubbleMetadata.Builder(
        bubbleIntent,
        IconCompat.createWithResource(context, R.mipmap.ic_launcher)
    )
    .setDesiredHeight(600)
    .setAutoExpandBubble(false)
    .setSuppressNotification(false)
    .build()

val person = Person.Builder().setName("Nyuwe").setImportant(true).build()

val notification = NotificationCompat.Builder(context, CHANNEL_ID)
    .setContentTitle("Nyuwe is running")
    .setContentText("Waiting for inquiries")
    .setSmallIcon(R.mipmap.ic_launcher)
    .setCategory(Notification.CATEGORY_MESSAGE)
    .setStyle(NotificationCompat.MessagingStyle(person)) // bubbles need a "conversation"
    .setShortcutId(SHORTCUT_ID)                          // + a published dynamic shortcut
    .setBubbleMetadata(bubbleData)
    .build()
```

### Option B: SYSTEM_ALERT_WINDOW overlay (true always-on-top chat-head)

Draws over EVERYTHING, even when no notification exists — what Messenger's
classic chat heads used.

**Play policy warning:** `SYSTEM_ALERT_WINDOW` is a restricted permission.
Google Play requires a use-case justification at review and may reject broad
uses. Ship Option A unless the overlay is genuinely essential.

`app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<application ...>
    <service android:name=".BubbleOverlayService" android:exported="false" />
</application>
```

Ask the user for overlay consent (it's a settings screen, not a dialog):

```kotlin
if (!Settings.canDrawOverlays(this)) {
    startActivity(
        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
    )
}
```

The overlay service (foreground service + WindowManager chat-head):

```kotlin
class BubbleOverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private lateinit var bubble: View

    override fun onCreate() {
        super.onCreate()
        startForeground(1, buildPersistentNotification()) // required to stay alive

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        bubble = LayoutInflater.from(this).inflate(R.layout.view_bubble, null)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, // API 26+
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.BOTTOM or Gravity.END; x = 24; y = 160 }

        // Tap → reopen the TWA. (Add an OnTouchListener updating params.x/y +
        // windowManager.updateViewLayout(bubble, params) for dragging.)
        bubble.setOnClickListener {
            startActivity(
                Intent(this, LauncherActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }

        windowManager.addView(bubble, params)
    }

    override fun onDestroy() {
        windowManager.removeView(bubble)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?) = null
}
```

Start it when the user enables "background bubble" in the app (and on
`BOOT_COMPLETED` if you want it to survive reboots).

## 4. What the web side already provides

- `enableNotifications: true` → the PWA's Web Push (new-inquiry alerts) fires as
  native notifications inside the TWA.
- The site's manifest shortcuts (Leads / My Quotes) become long-press app shortcuts.
- The in-page FloatingHub + Document-PiP desktop widget are untouched — this
  wrapper only adds the Android-native layer on top of the same deployed site.

## Checklist

- [ ] `bubblewrap init` + `build`, keystore backed up
- [ ] SHA-256 fingerprint(s) → `public/.well-known/assetlinks.json` → deployed
- [ ] Asset-links verifier green (no browser bar in the app)
- [ ] Push notification arrives inside the TWA
- [ ] Bubble path chosen: Bubbles API (default) or SYSTEM_ALERT_WINDOW (+ Play justification)
