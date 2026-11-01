// Column and list labels for registrations (staff) and "Registered on" (buyer). Merged into I18N after i18n.js.
// Machine-drafted: have a native speaker review each language before launch.
const I18N_COLS = {
  en: { col_order_dealer: 'Order no. / Dealer', col_registered: 'Registered on', b_registered_on: 'Registered on' },
  hi: { col_order_dealer: 'ऑर्डर नंबर / डीलर', col_registered: 'रजिस्टर्ड तारीख', b_registered_on: 'रजिस्टर्ड तारीख' },
  ta: { col_order_dealer: 'ஆர்டர் எண் / வியாபாரி', col_registered: 'பதிவு செய்த தேதி', b_registered_on: 'பதிவு செய்த தேதி' },
  te: { col_order_dealer: 'ఆర్డర్ నంబర్ / డీలర్', col_registered: 'రిజిస్టర్ చేసిన తేదీ', b_registered_on: 'రిజిస్టర్ చేసిన తేదీ' },
  ml: { col_order_dealer: 'ഓർഡർ നമ്പർ / ഡീലർ', col_registered: 'രജിസ്റ്റർ ചെയ്ത തീയതി', b_registered_on: 'രജിസ്റ്റർ ചെയ്ത തീയതി' },
  bn: { col_order_dealer: 'অর্ডার নম্বর / ডিলার', col_registered: 'নিবন্ধনের তারিখ', b_registered_on: 'নিবন্ধনের তারিখ' },
  kn: { col_order_dealer: 'ಆರ್ಡರ್ ಸಂಖ್ಯೆ / ಡೀಲರ್', col_registered: 'ನೋಂದಾಯಿಸಿದ ದಿನಾಂಕ', b_registered_on: 'ನೋಂದಾಯಿಸಿದ ದಿನಾಂಕ' },
  mr: { col_order_dealer: 'ऑर्डर नंबर / डीलर', col_registered: 'नोंदणी तारीख', b_registered_on: 'नोंदणी तारीख' },
  gu: { col_order_dealer: 'ઓર્ડર નંબર / ડીલર', col_registered: 'નોંધણી તારીખ', b_registered_on: 'નોંધણી તારીખ' },
  pa: { col_order_dealer: 'ਆਰਡਰ ਨੰਬਰ / ਡੀਲਰ', col_registered: 'ਰਜਿਸਟਰ ਹੋਈ ਮਿਤੀ', b_registered_on: 'ਰਜਿਸਟਰ ਹੋਈ ਮਿਤੀ' },
  or: { col_order_dealer: 'ଅର୍ଡର ନମ୍ବର / ଡିଲର', col_registered: 'ପଞ୍ଜୀକରଣ ତାରିଖ', b_registered_on: 'ପଞ୍ଜୀକରଣ ତାରିଖ' },
  as: { col_order_dealer: 'অৰ্ডাৰ নম্বৰ / ডিলাৰ', col_registered: 'পঞ্জীয়নৰ তাৰিখ', b_registered_on: 'পঞ্জীয়নৰ তাৰিখ' },
};
const I18N_REG_DETAIL = {
  en: { btn_view_reg: 'View Details', reg_detail_title: 'Registration details', reg_address: 'Address', bill_photo: 'Bill photo' },
  hi: { btn_view_reg: 'विवरण देखें', reg_detail_title: 'रजिस्ट्रेशन का विवरण', reg_address: 'पता', bill_photo: 'बिल की फ़ोटो' },
  ta: { btn_view_reg: 'விவரங்களைப் பார்', reg_detail_title: 'பதிவு விவரங்கள்', reg_address: 'முகவரி', bill_photo: 'பில் புகைப்படம்' },
  te: { btn_view_reg: 'వివరాలు చూడండి', reg_detail_title: 'నమోదు వివరాలు', reg_address: 'చిరునామా', bill_photo: 'బిల్లు ఫోటో' },
  ml: { btn_view_reg: 'വിവരങ്ങൾ കാണുക', reg_detail_title: 'രജിസ്ട്രേഷൻ വിവരങ്ങൾ', reg_address: 'വിലാസം', bill_photo: 'ബില്ലിന്റെ ഫോട്ടോ' },
  bn: { btn_view_reg: 'বিস্তারিত দেখুন', reg_detail_title: 'নিবন্ধনের বিবরণ', reg_address: 'ঠিকানা', bill_photo: 'বিলের ছবি' },
  kn: { btn_view_reg: 'ವಿವರ ನೋಡಿ', reg_detail_title: 'ನೋಂದಣಿ ವಿವರಗಳು', reg_address: 'ವಿಳಾಸ', bill_photo: 'ಬಿಲ್ ಫೋಟೋ' },
  mr: { btn_view_reg: 'तपशील पहा', reg_detail_title: 'नोंदणी तपशील', reg_address: 'पत्ता', bill_photo: 'बिलाचा फोटो' },
  gu: { btn_view_reg: 'વિગતો જુઓ', reg_detail_title: 'નોંધણીની વિગતો', reg_address: 'સરનામું', bill_photo: 'બિલનો ફોટો' },
  pa: { btn_view_reg: 'ਵੇਰਵੇ ਵੇਖੋ', reg_detail_title: 'ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਦੇ ਵੇਰਵੇ', reg_address: 'ਪਤਾ', bill_photo: 'ਬਿੱਲ ਦੀ ਫ਼ੋਟੋ' },
  or: { btn_view_reg: 'ବିବରଣୀ ଦେଖନ୍ତୁ', reg_detail_title: 'ପଞ୍ଜୀକରଣ ବିବରଣୀ', reg_address: 'ଠିକଣା', bill_photo: 'ବିଲ୍‌ର ଫଟୋ' },
  as: { btn_view_reg: 'বিৱৰণ চাওক', reg_detail_title: 'পঞ্জীয়নৰ বিৱৰণ', reg_address: 'ঠিকনা', bill_photo: 'বিলৰ ছবি' },
};
for (const lang of Object.keys(I18N_REG_DETAIL)) {
  if (typeof I18N !== 'undefined' && I18N[lang]) Object.assign(I18N[lang], I18N_REG_DETAIL[lang]);
}
for (const lang of Object.keys(I18N_COLS)) {
  if (typeof I18N !== 'undefined' && I18N[lang]) Object.assign(I18N[lang], I18N_COLS[lang]);
}
