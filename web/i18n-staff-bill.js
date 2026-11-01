// Staff: "View bill" button in the registrations list. Merged into I18N after i18n.js.
// Machine-drafted: have a native speaker review each language before launch.
const I18N_STAFF_BILL = {
  en: { btn_bill: 'View bill' }, hi: { btn_bill: 'बिल देखें' }, ta: { btn_bill: 'பில் பார்' }, te: { btn_bill: 'బిల్లు చూడండి' },
  ml: { btn_bill: 'ബിൽ കാണുക' }, bn: { btn_bill: 'বিল দেখুন' }, kn: { btn_bill: 'ಬಿಲ್ ನೋಡಿ' }, mr: { btn_bill: 'बिल पहा' },
  gu: { btn_bill: 'બિલ જુઓ' }, pa: { btn_bill: 'ਬਿੱਲ ਵੇਖੋ' }, or: { btn_bill: 'ବିଲ୍ ଦେଖନ୍ତୁ' }, as: { btn_bill: 'বিল চাওক' },
};
for (const lang of Object.keys(I18N_STAFF_BILL)) {
  if (typeof I18N !== 'undefined' && I18N[lang]) Object.assign(I18N[lang], I18N_STAFF_BILL[lang]);
}
