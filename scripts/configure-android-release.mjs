import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const [major, minor, patch] = version.split('.').map(Number);
if (![major, minor, patch].every(Number.isInteger) || minor > 99 || patch > 99) throw Error('Invalid Android version');
const file = 'android/app/build.gradle';
let source = readFileSync(file, 'utf8');
source = source.replace(/versionCode\s+\d+/, `versionCode ${major * 10000 + minor * 100 + patch}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
writeFileSync(file, source);
appendFileSync(file, `
android {
    signingConfigs {
        charisnaRelease {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
        }
    }
    buildTypes { release { signingConfig signingConfigs.charisnaRelease } }
}
`);
