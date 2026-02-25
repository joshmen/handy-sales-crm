/**
 * Expo Config Plugin: Bluetooth Permissions for ESC/POS printers
 *
 * Adds proper AndroidManifest.xml attributes that the `android.permissions`
 * array in app.config.ts cannot express:
 * - BLUETOOTH_SCAN with `neverForLocation` flag (no location needed for BT)
 * - Legacy BLUETOOTH/BLUETOOTH_ADMIN scoped to maxSdkVersion 30
 *
 * Location permissions (ACCESS_FINE/COARSE_LOCATION) are kept WITHOUT
 * maxSdkVersion because the app also uses react-native-maps.
 */
const { withAndroidManifest } = require("expo/config-plugins");

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withBluetoothPermissions = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Remove any auto-added BT permissions so we can re-add with attributes
    const btPermissions = [
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.BLUETOOTH_SCAN",
    ];

    if (manifest["uses-permission"]) {
      manifest["uses-permission"] = manifest["uses-permission"].filter(
        (perm) => !btPermissions.includes(perm.$["android:name"]),
      );
    } else {
      manifest["uses-permission"] = [];
    }

    // Legacy permissions — only for Android <= 11 (API 30)
    manifest["uses-permission"].push(
      {
        $: {
          "android:name": "android.permission.BLUETOOTH",
          "android:maxSdkVersion": "30",
        },
      },
      {
        $: {
          "android:name": "android.permission.BLUETOOTH_ADMIN",
          "android:maxSdkVersion": "30",
        },
      },
    );

    // Android 12+ (API 31) permissions
    manifest["uses-permission"].push(
      {
        $: {
          "android:name": "android.permission.BLUETOOTH_CONNECT",
        },
      },
      {
        $: {
          "android:name": "android.permission.BLUETOOTH_SCAN",
          "android:usesPermissionFlags": "neverForLocation",
        },
      },
    );

    return config;
  });
};

module.exports = withBluetoothPermissions;
