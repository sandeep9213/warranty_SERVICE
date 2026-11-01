// Extra buyer strings (sign-out, profile view labels, toasts, product line). Merged into I18N after i18n-buyer.js.
// Machine-drafted: have a native speaker review each language before launch.
const I18N_BUYER_EXTRA = {
  en: {
    b_sign_out: 'Sign out', b_cancel: 'Cancel', b_profile_edit_title: 'Edit your details', b_save_changes: 'Save changes',
    b_not_provided: 'Not provided', b_f_name: 'Name of customer', b_f_email: 'Email ID', b_f_phone: 'Registered phone no.',
    b_f_google: 'Google sign-in email', b_profile_updated: 'Your details were updated.',
    b_toast_product_created: 'Product registered. A confirmation email is on its way. Please keep your bill safe.',
    b_bought_from: 'Bought {date} from {place}', b_order_no: 'Order {n}', b_serial_no: 'Serial: {n}', b_lang_label: 'Language',
  },
  hi: {
    b_sign_out: 'साइन आउट', b_cancel: 'रद्द करें', b_profile_edit_title: 'अपना विवरण बदलें', b_save_changes: 'बदलाव सेव करें',
    b_not_provided: 'दिया नहीं गया', b_f_name: 'ग्राहक का नाम', b_f_email: 'ईमेल आईडी', b_f_phone: 'रजिस्टर्ड फ़ोन नंबर',
    b_f_google: 'Google साइन-इन ईमेल', b_profile_updated: 'आपका विवरण अपडेट हो गया है।',
    b_toast_product_created: 'उत्पाद रजिस्टर हो गया। पुष्टि का ईमेल भेजा जा रहा है। कृपया अपना बिल सुरक्षित रखें।',
    b_bought_from: '{date} को {place} से खरीदा', b_order_no: 'ऑर्डर {n}', b_serial_no: 'सीरियल: {n}', b_lang_label: 'भाषा',
  },
  ta: {
    b_sign_out: 'வெளியேறு', b_cancel: 'ரத்து செய்', b_profile_edit_title: 'உங்கள் விவரங்களைத் திருத்து', b_save_changes: 'மாற்றங்களைச் சேமி',
    b_not_provided: 'வழங்கப்படவில்லை', b_f_name: 'வாடிக்கையாளர் பெயர்', b_f_email: 'மின்னஞ்சல் முகவரி', b_f_phone: 'பதிவு செய்த தொலைபேசி எண்',
    b_f_google: 'Google உள்நுழைவு மின்னஞ்சல்', b_profile_updated: 'உங்கள் விவரங்கள் புதுப்பிக்கப்பட்டன.',
    b_toast_product_created: 'பொருள் பதிவு செய்யப்பட்டது. உறுதிப்படுத்தல் மின்னஞ்சல் அனுப்பப்படுகிறது. உங்கள் ரசீதைப் பாதுகாப்பாக வைக்கவும்.',
    b_bought_from: '{date} அன்று {place} இல் வாங்கியது', b_order_no: 'ஆர்டர் {n}', b_serial_no: 'வரிசை எண்: {n}', b_lang_label: 'மொழி',
  },
  te: {
    b_sign_out: 'సైన్ అవుట్', b_cancel: 'రద్దు చేయి', b_profile_edit_title: 'మీ వివరాలను మార్చండి', b_save_changes: 'మార్పులు సేవ్ చేయి',
    b_not_provided: 'అందించలేదు', b_f_name: 'కస్టమర్ పేరు', b_f_email: 'ఇమెయిల్ ఐడి', b_f_phone: 'రిజిస్టర్ చేసిన ఫోన్ నంబర్',
    b_f_google: 'Google సైన్-ఇన్ ఇమెయిల్', b_profile_updated: 'మీ వివరాలు నవీకరించబడ్డాయి.',
    b_toast_product_created: 'ఉత్పత్తి రిజిస్టర్ అయింది. నిర్ధారణ ఇమెయిల్ పంపబడుతోంది. మీ బిల్లును జాగ్రత్తగా ఉంచండి.',
    b_bought_from: '{date} న {place} నుండి కొనుగోలు', b_order_no: 'ఆర్డర్ {n}', b_serial_no: 'సీరియల్: {n}', b_lang_label: 'భాష',
  },
  ml: {
    b_sign_out: 'സൈൻ ഔട്ട്', b_cancel: 'റദ്ദാക്കുക', b_profile_edit_title: 'നിങ്ങളുടെ വിവരങ്ങൾ തിരുത്തുക', b_save_changes: 'മാറ്റങ്ങൾ സേവ് ചെയ്യുക',
    b_not_provided: 'നൽകിയിട്ടില്ല', b_f_name: 'ഉപഭോക്താവിന്റെ പേര്', b_f_email: 'ഇമെയിൽ ഐഡി', b_f_phone: 'രജിസ്റ്റർ ചെയ്ത ഫോൺ നമ്പർ',
    b_f_google: 'Google സൈൻ-ഇൻ ഇമെയിൽ', b_profile_updated: 'നിങ്ങളുടെ വിവരങ്ങൾ അപ്ഡേറ്റ് ചെയ്തു.',
    b_toast_product_created: 'ഉൽപ്പന്നം രജിസ്റ്റർ ചെയ്തു. സ്ഥിരീകരണ ഇമെയിൽ അയയ്ക്കുന്നു. ബിൽ സൂക്ഷിച്ചുവെക്കുക.',
    b_bought_from: '{date} ന് {place} ൽ നിന്ന് വാങ്ങിയത്', b_order_no: 'ഓർഡർ {n}', b_serial_no: 'സീരിയൽ: {n}', b_lang_label: 'ഭാഷ',
  },
  bn: {
    b_sign_out: 'সাইন আউট', b_cancel: 'বাতিল করুন', b_profile_edit_title: 'আপনার বিবরণ সম্পাদনা করুন', b_save_changes: 'পরিবর্তন সংরক্ষণ করুন',
    b_not_provided: 'দেওয়া হয়নি', b_f_name: 'ক্রেতার নাম', b_f_email: 'ইমেল আইডি', b_f_phone: 'নিবন্ধিত ফোন নম্বর',
    b_f_google: 'Google সাইন-ইন ইমেল', b_profile_updated: 'আপনার বিবরণ আপডেট করা হয়েছে।',
    b_toast_product_created: 'পণ্য নিবন্ধিত হয়েছে। নিশ্চিতকরণ ইমেল পাঠানো হচ্ছে। আপনার বিলটি নিরাপদে রাখুন।',
    b_bought_from: '{date} তারিখে {place} থেকে কেনা', b_order_no: 'অর্ডার {n}', b_serial_no: 'সিরিয়াল: {n}', b_lang_label: 'ভাষা',
  },
  kn: {
    b_sign_out: 'ಸೈನ್ ಔಟ್', b_cancel: 'ರದ್ದುಮಾಡಿ', b_profile_edit_title: 'ನಿಮ್ಮ ವಿವರಗಳನ್ನು ತಿದ್ದಿ', b_save_changes: 'ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ',
    b_not_provided: 'ಒದಗಿಸಿಲ್ಲ', b_f_name: 'ಗ್ರಾಹಕರ ಹೆಸರು', b_f_email: 'ಇಮೇಲ್ ಐಡಿ', b_f_phone: 'ನೋಂದಾಯಿತ ಫೋನ್ ಸಂಖ್ಯೆ',
    b_f_google: 'Google ಸೈನ್-ಇನ್ ಇಮೇಲ್', b_profile_updated: 'ನಿಮ್ಮ ವಿವರಗಳನ್ನು ನವೀಕರಿಸಲಾಗಿದೆ.',
    b_toast_product_created: 'ಉತ್ಪನ್ನ ನೋಂದಾಯಿಸಲಾಗಿದೆ. ದೃಢೀಕರಣ ಇಮೇಲ್ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ. ನಿಮ್ಮ ಬಿಲ್ ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿಡಿ.',
    b_bought_from: '{date} ರಂದು {place} ನಿಂದ ಖರೀದಿಸಲಾಗಿದೆ', b_order_no: 'ಆರ್ಡರ್ {n}', b_serial_no: 'ಸೀರಿಯಲ್: {n}', b_lang_label: 'ಭಾಷೆ',
  },
  mr: {
    b_sign_out: 'साइन आउट', b_cancel: 'रद्द करा', b_profile_edit_title: 'तुमचा तपशील संपादित करा', b_save_changes: 'बदल जतन करा',
    b_not_provided: 'दिलेले नाही', b_f_name: 'ग्राहकाचे नाव', b_f_email: 'ईमेल आयडी', b_f_phone: 'नोंदणीकृत फोन नंबर',
    b_f_google: 'Google साइन-इन ईमेल', b_profile_updated: 'तुमचा तपशील अपडेट झाला.',
    b_toast_product_created: 'उत्पादन नोंदवले गेले. पुष्टीकरण ईमेल पाठवले जात आहे. कृपया तुमचे बिल जपून ठेवा.',
    b_bought_from: '{date} रोजी {place} येथून खरेदी', b_order_no: 'ऑर्डर {n}', b_serial_no: 'सिरीयल: {n}', b_lang_label: 'भाषा',
  },
  gu: {
    b_sign_out: 'સાઇન આઉટ', b_cancel: 'રદ કરો', b_profile_edit_title: 'તમારી વિગતો બદલો', b_save_changes: 'ફેરફારો સાચવો',
    b_not_provided: 'આપેલ નથી', b_f_name: 'ગ્રાહકનું નામ', b_f_email: 'ઇમેઇલ આઈડી', b_f_phone: 'નોંધાયેલ ફોન નંબર',
    b_f_google: 'Google સાઇન-ઇન ઇમેઇલ', b_profile_updated: 'તમારી વિગતો અપડેટ થઈ ગઈ.',
    b_toast_product_created: 'ઉત્પાદન નોંધાયું. પુષ્ટિ ઇમેઇલ મોકલાઈ રહ્યો છે. કૃપા કરીને તમારું બિલ સાચવી રાખો.',
    b_bought_from: '{date} ના રોજ {place} થી ખરીદ્યું', b_order_no: 'ઓર્ડર {n}', b_serial_no: 'સીરીયલ: {n}', b_lang_label: 'ભાષા',
  },
  pa: {
    b_sign_out: 'ਸਾਈਨ ਆਉਟ', b_cancel: 'ਰੱਦ ਕਰੋ', b_profile_edit_title: 'ਆਪਣੇ ਵੇਰਵੇ ਬਦਲੋ', b_save_changes: 'ਬਦਲਾਅ ਸੰਭਾਲੋ',
    b_not_provided: 'ਦਿੱਤਾ ਨਹੀਂ ਗਿਆ', b_f_name: 'ਗਾਹਕ ਦਾ ਨਾਮ', b_f_email: 'ਈਮੇਲ ਆਈਡੀ', b_f_phone: 'ਰਜਿਸਟਰਡ ਫ਼ੋਨ ਨੰਬਰ',
    b_f_google: 'Google ਸਾਈਨ-ਇਨ ਈਮੇਲ', b_profile_updated: 'ਤੁਹਾਡੇ ਵੇਰਵੇ ਅੱਪਡੇਟ ਹੋ ਗਏ।',
    b_toast_product_created: 'ਉਤਪਾਦ ਰਜਿਸਟਰ ਹੋ ਗਿਆ। ਪੁਸ਼ਟੀ ਵਾਲੀ ਈਮੇਲ ਭੇਜੀ ਜਾ ਰਹੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਬਿੱਲ ਸੰਭਾਲ ਕੇ ਰੱਖੋ।',
    b_bought_from: '{date} ਨੂੰ {place} ਤੋਂ ਖਰੀਦਿਆ', b_order_no: 'ਆਰਡਰ {n}', b_serial_no: 'ਸੀਰੀਅਲ: {n}', b_lang_label: 'ਭਾਸ਼ਾ',
  },
  or: {
    b_sign_out: 'ସାଇନ୍ ଆଉଟ୍', b_cancel: 'ବାତିଲ୍ କରନ୍ତୁ', b_profile_edit_title: 'ଆପଣଙ୍କ ବିବରଣୀ ସଂଶୋଧନ କରନ୍ତୁ', b_save_changes: 'ପରିବର୍ତ୍ତନ ସେଭ୍ କରନ୍ତୁ',
    b_not_provided: 'ଦିଆଯାଇନାହିଁ', b_f_name: 'ଗ୍ରାହକଙ୍କ ନାମ', b_f_email: 'ଇମେଲ୍ ଆଇଡି', b_f_phone: 'ପଞ୍ଜୀକୃତ ଫୋନ୍ ନମ୍ବର',
    b_f_google: 'Google ସାଇନ୍-ଇନ୍ ଇମେଲ୍', b_profile_updated: 'ଆପଣଙ୍କ ବିବରଣୀ ଅପଡେଟ୍ ହୋଇଛି।',
    b_toast_product_created: 'ଉତ୍ପାଦ ପଞ୍ଜୀକୃତ ହୋଇଛି। ନିଶ୍ଚିତକରଣ ଇମେଲ୍ ପଠାଯାଉଛି। ଦୟାକରି ଆପଣଙ୍କ ବିଲ୍ ସୁରକ୍ଷିତ ରଖନ୍ତୁ।',
    b_bought_from: '{date} ରେ {place} ରୁ କିଣାଯାଇଛି', b_order_no: 'ଅର୍ଡର୍ {n}', b_serial_no: 'ସିରିଆଲ୍: {n}', b_lang_label: 'ଭାଷା',
  },
  as: {
    b_sign_out: 'ছাইন আউট', b_cancel: 'বাতিল কৰক', b_profile_edit_title: 'আপোনাৰ বিৱৰণ সম্পাদনা কৰক', b_save_changes: 'সলনি সংৰক্ষণ কৰক',
    b_not_provided: 'দিয়া হোৱা নাই', b_f_name: 'গ্ৰাহকৰ নাম', b_f_email: 'ইমেইল আইডি', b_f_phone: 'পঞ্জীভুক্ত ফোন নম্বৰ',
    b_f_google: 'Google ছাইন-ইন ইমেইল', b_profile_updated: 'আপোনাৰ বিৱৰণ আপডেইট কৰা হ\'ল।',
    b_toast_product_created: 'সামগ্ৰী পঞ্জীয়ন হ\'ল। নিশ্চিতকৰণ ইমেইল পঠোৱা হৈছে। অনুগ্ৰহ কৰি আপোনাৰ বিল সুৰক্ষিত ৰাখক।',
    b_bought_from: '{date} তাৰিখে {place} ৰ পৰা কিনা', b_order_no: 'অৰ্ডাৰ {n}', b_serial_no: 'ছিৰিয়েল: {n}', b_lang_label: 'ভাষা',
  },
};

for (const lang of Object.keys(I18N_BUYER_EXTRA)) {
  if (typeof I18N !== 'undefined' && I18N[lang]) Object.assign(I18N[lang], I18N_BUYER_EXTRA[lang]);
}

// Two more buyer strings: a placeholder and an empty-product message.
const I18N_BUYER_MORE = {
  en: { b_ph_digits: '10 digits, without +91', b_register_first: 'Register a product first' },
  hi: { b_ph_digits: '10 अंक, +91 के बिना', b_register_first: 'पहले कोई उत्पाद रजिस्टर करें' },
  ta: { b_ph_digits: '10 இலக்கங்கள், +91 இல்லாமல்', b_register_first: 'முதலில் ஒரு பொருளைப் பதிவு செய்யவும்' },
  te: { b_ph_digits: '10 అంకెలు, +91 లేకుండా', b_register_first: 'ముందుగా ఉత్పత్తిని రిజిస్టర్ చేయండి' },
  ml: { b_ph_digits: '10 അക്കങ്ങൾ, +91 ഇല്ലാതെ', b_register_first: 'ആദ്യം ഒരു ഉൽപ്പന്നം രജിസ്റ്റർ ചെയ്യുക' },
  bn: { b_ph_digits: '১০ সংখ্যা, +91 ছাড়া', b_register_first: 'প্রথমে একটি পণ্য নিবন্ধন করুন' },
  kn: { b_ph_digits: '10 ಅಂಕಿ, +91 ಇಲ್ಲದೆ', b_register_first: 'ಮೊದಲು ಉತ್ಪನ್ನ ನೋಂದಾಯಿಸಿ' },
  mr: { b_ph_digits: '10 अंक, +91 शिवाय', b_register_first: 'आधी एक उत्पादन नोंदवा' },
  gu: { b_ph_digits: '10 અંક, +91 વગર', b_register_first: 'પહેલા ઉત્પાદન નોંધો' },
  pa: { b_ph_digits: '10 ਅੰਕ, +91 ਤੋਂ ਬਿਨਾਂ', b_register_first: 'ਪਹਿਲਾਂ ਉਤਪਾਦ ਰਜਿਸਟਰ ਕਰੋ' },
  or: { b_ph_digits: '୧୦ ଅଙ୍କ, +91 ବିନା', b_register_first: 'ପ୍ରଥମେ ଉତ୍ପାଦ ପଞ୍ଜୀକୃତ କରନ୍ତୁ' },
  as: { b_ph_digits: '১০ টা সংখ্যা, +91 বাদে', b_register_first: 'প্ৰথমে এটা সামগ্ৰী পঞ্জীয়ন কৰক' },
};
for (const lang of Object.keys(I18N_BUYER_MORE)) {
  if (typeof I18N !== 'undefined' && I18N[lang]) Object.assign(I18N[lang], I18N_BUYER_MORE[lang]);
}
