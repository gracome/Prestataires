node -e "
const fs=require('fs');const p='src/app/page.tsx';let s=fs.readFileSync(p,'utf8');
const reps=[
  ['    monthly: 4000,\n    yearly: 48000,\n','    monthly: 5000,\n'],
  ['    monthly: 6000,\n    yearly: 72000,\n','    monthly: 7500,\n'],
  ['    monthly: 10000,\n    yearly: 120000,\n','    monthly: 12000,\n'],
];
for(const [o,n] of reps){ if(!s.includes(o)) throw new Error('absent: '+o.trim()); s=s.replace(o,n); }
fs.writeFileSync(p,s);console.log('tarifs des packages mis a jour');
"; rm -f ./.price-edit.js
