// Short title shown in the middle of the phone header. Merged into I18N after the other buyer files.
// Machine-drafted: have a native speaker review each language before launch.
const I18N_BUYER_TITLE = {
  en: { b_title_short: 'Service and Warranty' }, hi: { b_title_short: 'सर्विस और वारंटी' }, ta: { b_title_short: 'சேவை மற்றும் உத்தரவாதம்' },
  te: { b_title_short: 'సర్వీస్ మరియు వారంటీ' }, ml: { b_title_short: 'സർവീസും വാറന്റിയും' }, bn: { b_title_short: 'সার্ভিস ও ওয়ারেন্টি' },
  kn: { b_title_short: 'ಸೇವೆ ಮತ್ತು ಖಾತರಿ' }, mr: { b_title_short: 'सर्व्हिस व वॉरंटी' }, gu: { b_title_short: 'સર્વિસ અને વોરંટી' },
  pa: { b_title_short: 'ਸਰਵਿਸ ਅਤੇ ਵਾਰੰਟੀ' }, or: { b_title_short: 'ସେବା ଓ ୱାରେଣ୍ଟି' }, as: { b_title_short: 'সেৱা আৰু ৱাৰেণ্টি' },
};
for (const lang of Object.keys(I18N_BUYER_TITLE)) {
  if (typeof I18N !== 'undefined' && I18N[lang]) Object.assign(I18N[lang], I18N_BUYER_TITLE[lang]);
}
