# Gaon Bazaar — doosre laptop par chalayein

## Sabse aasan tarika

1. Node.js **24 LTS** install karein: https://nodejs.org/en/download
2. ZIP ko extract karein. VS Code mein **File > Open Folder** se extracted folder kholein (jisme package.json hai).
3. VS Code mein **Terminal > New Terminal** kholein:

```sh
node --version
npm start
```

Version `v24...` hona chahiye. Website: **http://localhost:3000**. Terminal chalu rakhein; band karne ke liye Ctrl+C.

Ready-built frontend aur backend ZIP mein included hain, isliye pehli baar chalane ke liye npm install zaroori nahi. Windows par START-WINDOWS.cmd double-click bhi kar sakte hain. MySQL, XAMPP, API key ya Cloudflare login ki zaroorat nahi.

## Code edit aur rebuild

Pehli baar dependencies install karne ke liye internet chahiye:

```sh
npm ci
npm run build
npm start
```

UI edit karne ke baad server Ctrl+C se rokein, `npm run build` chalayein aur `npm start` karein. Browser refresh karein. `npm run dev` initial build aur server watch karta hai; frontend edits ke liye rebuild phir bhi zaroori hai.

PowerShell agar npm.ps1 block kare to commands mein `npm` ki jagah `npm.cmd` use karein, ya VS Code terminal mein Command Prompt select karein.

## Test karein

Seller account banayein > My shop > shop create karein > product add karein. Incognito window mein doosra customer account banayein. Delivery location shop ke 5–10 km ke andar rakhein, cart se Cash on Delivery order karein. Seller dashboard se Accepted > Out for delivery > Delivered karein.

```sh
npm test
npm run typecheck
npm run test:cloud
```

## Data kahan rahega?

Accounts, shops aur orders `standalone/data/gaon-bazaar.sqlite` mein save hote hain. Naya laptop initially empty database banayega. Cloud website aur local laptop ke databases alag hain. Apna purana local data transfer karna ho to server band karke poora `standalone/data` folder privately copy karein. Is ZIP mein existing users, passwords, sessions ya private database nahi hai.

Maps ke tiles ke liye internet chahiye. Coordinates manually bhi enter kar sakte hain. English, Hindi aur Hinglish available hain; doosri listed languages abhi translation pending hain.

## Main files

- `app/page.tsx`: shopping aur seller screens
- `app/globals.css`: styles
- `app/location-picker.tsx`: map/address picker
- `lib/messages.ts`, `lib/language.ts`: language translations
- `app/api/market/route.ts`: shop, product aur order API
- `standalone/server.mjs`: local server aur signup/login
- `db/`, `drizzle/`: database schema
- `cloud/`: Cloudflare Pages + D1 backend source
- `scripts/`: reproducible builds
- `tests/`: integration tests

Cloud deployment ke liye `npm run build:pages` se output banega. Cloudflare Pages par `dist/pages` upload karein, D1 mein `cloud/setup.sql` execute karein, database ko `DB` naam se bind karke redeploy karein. Local running ke liye yeh optional hai.
