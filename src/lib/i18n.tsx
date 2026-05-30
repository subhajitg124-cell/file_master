import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, AppLanguage } from "./document-automation";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
};

const KEY = "filenova-language";

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

// Comprehensive dictionary for on-the-fly translation of dynamic blocks like rules/documents/quick-actions
const DYNAMIC_TRANSLATIONS: Record<Exclude<AppLanguage, "en">, Record<string, string>> = {
  bn: {
    // Rule Titles
    "Scholarship ZIP Maker": "স্কলারশিপ জিপ মেকার",
    "Lakshmir Bhandar": "লক্ষ্মীর ভাণ্ডার",
    "PAN Card Upload Fix": "প্যান কার্ড আপলোড ফিক্স",
    "College Admission ZIP": "কলেজ অ্যাডমিশন জিপ",
    "Job Application Pack": "জব অ্যাপ্লিকেশন প্যাক",

    // Rule Descriptions
    "Income, caste, marksheet, bank passbook, photo and signature packed for scholarship portals.": "স্কলারশিপ পোর্টালের জন্য আয়, জাতি, মার্কশীট, ব্যাঙ্ক পাসবুক, ছবি এবং স্বাক্ষর একত্রিত করা হয়েছে।",
    "Aadhaar, Swasthya Sathi, bank and photo documents validated for West Bengal scheme submission.": "পশ্চিমবঙ্গের স্কিম জমা দেওয়ার জন্য আধার, স্বাস্থ্য সাথী, ব্যাঙ্ক এবং ছবির নথি যাচাই করা হয়েছে।",
    "Photo, signature and identity proof resized for PAN application portals.": "প্যান আবেদন পোর্টালের জন্য ছবি, স্বাক্ষর এবং পরিচয়পত্র রিসাইজ করা হয়েছে।",
    "Admission form, marksheets, certificates, photo and payment proof organized for college portals.": "কলেজ পোর্টালের জন্য ভর্তি ফর্ম, মার্কশীট, সার্টিফিকেট, ছবি এবং পেমেন্টের রসিদ সংগঠিত করা হয়েছে।",
    "CV, certificates, photo, signature and identity proof prepared for job form uploads.": "চাকরির ফর্ম আপলোডের জন্য সিভি, সার্টিফিকেট, ছবি, স্বাক্ষর এবং পরিচয়পত্র প্রস্তুত করা হয়েছে।",

    // Document checklist labels
    "Passport photo": "পাসপোর্ট সাইজ ছবি",
    "Applicant photo": "আবেদনকারীর ছবি",
    "Candidate photo": "প্রার্থীর ছবি",
    "Photo": "ছবি",
    "PAN photo": "প্যান ছবি",
    "Signature": "স্বাক্ষর",
    "PAN signature": "প্যান স্বাক্ষর",
    "Income certificate": "আয় সার্টিফিকেট",
    "Last marksheet": "গত পরীক্ষার মার্কশীট",
    "Class 10 marksheet": "দশম শ্রেণীর মার্কশীট",
    "Class 12 marksheet": "দ্বাদশ শ্রেণীর মার্কশীট",
    "Bank passbook": "ব্যাঙ্ক পাসবুক",
    "Aadhaar card": "আধার কার্ড",
    "Identity proof": "পরিচয়পত্র",
    "Swasthya Sathi card": "স্বাস্থ্য সাথী কার্ড",
    "Filled form": "পূরণকৃত ফর্ম",
    "Payment receipt": "পেমেন্টের রসিদ",
    "Resume or CV": "রেজুমে বা সিভি",
    "Certificates": "সার্টিফিকেটসমূহ",

    // Document target instructions
    "200 x 230 px, under 50KB": "২০০ x ২৩০ px, ৫০KB এর নিচে",
    "140 x 60 px, under 30KB": "১৪০ x ৬০ px, ৩০KB এর নিচে",
    "PDF under 200KB": "২০০KB এর নিচে PDF",
    "Readable PDF under 300KB": "পঠনযোগ্য ৩০০KB এর নিচে PDF",
    "Account page only": "শুধুমাত্র অ্যাকাউন্ট সংক্রান্ত পাতা",
    "Clear front and back, under 200KB": "পরিষ্কার সামনে ও পিছনের অংশ, ২০০KB এর নিচে",
    "Name, IFSC and account visible": "নাম, IFSC এবং অ্যাকাউন্ট নম্বর পরিষ্কার দৃশ্যমান",
    "Passport photo under 50KB": "৫০KB এর নিচে পাসপোর্ট ছবি",
    "Optional supporting document": "ঐচ্ছিক সহায়ক নথি",
    "213 x 213 px JPG": "২১৩ x ২১৩ px JPG",
    "276 x 118 px JPG": "২৭৬ x ১১৮ px JPG",
    "PDF under 300KB": "৩০০KB এর নিচে PDF",
    "Merged PDF under 500KB": "৫০০KB এর নিচে মার্জ করা PDF",
    "Readable scan": "পরিষ্কার স্ক্যান করা কপি",
    "Passport format": "পাসপোর্ট ফরম্যাট",
    "Optional receipt": "ঐচ্ছিক রসিদ",
    "PDF under 500KB": "৫০০KB এর নিচে PDF",
    "Transparent/white background": "স্বচ্ছ/সাদা ব্যাকগ্রাউন্ড",
    "Merged in correct order": "সদস্য সঠিক ক্রমে মার্জ করা",

    // Quick Action labels (Easy Access Tiles)
    "Aadhaar resize": "আধার রিসাইজ",
    "Signature resize": "স্বাক্ষর রিসাইজ",
    "Image compressor": "ছবি কমপ্রেসার",
    "Scan cleanup": "স্ক্যান পরিষ্কার করা",
    "OCR text extraction": "OCR লেখা নিষ্কাশন",
    "Auto ZIP creator": "অটো ZIP ক্রিয়েটর",

    // General Words and Sections
    "Easy Access Tiles": "সহজ এক্সেস টাইলস",
    "Clickable visual shortcuts for portal uploads": "পোর্টাল আপলোডের জন্য ক্লিকযোগ্য ত্বরিত শর্টকাট",
    "Explore Features": "বৈশিষ্ট্য অন্বেষণ করুন",
    "Aesthetic System Launch": "নান্দনিক সিস্টেম লঞ্চ",
    "This website is currently in its active development phase, and we sincerely apologize for any temporary layout adjustments or incomplete interfaces!": "এই ওয়েবসাইটটি বর্তমানে সক্রিয় বিকাশের পর্যায়ে রয়েছে এবং আমরা যে কোনো সাময়িক বিন্যাস সংশোধন বা অসমাপ্ত ইন্টারফেসের জন্য আন্তরিকভাবে দুঃখিত!",
    "You can test all of FileNova's specialized localized browser compilers & form criteria immediately!": "আপনি অবিলম্বে ফাইলনোভার সমস্ত বিশেষ ক্রপ ও সিলেকশন ক্রাইটেরিয়া পরীক্ষা করতে পারেন!",
    "Premium quick actions": "প্রিমিয়াম দ্রুত অ্যাকশন",
    "Voice & sharing helpers": "ভয়েস এবং শেয়ারিং সহায়ক",
    "Use voice commands or generate a secure WhatsApp share link for files without leaving the workspace.": "ওয়ার্কস্পেস না ছেড়েই ভয়েস কমান্ড ব্যবহার করুন বা ফাইলের সুরক্ষিত হোয়াটসঅ্যাপ লিংক তৈরি করুন।",
    "Voice commands work in English, Hindi & Bengali": "ভয়েস কমান্ড ইংরেজি, হিন্দি এবং বাংলায় চলে",
    "Tap to Speak": "বলার জন্য ট্যাপ করুন",
    "Listening…": "শুনছি…",
    "Test speaker": "স্পিকার পরীক্ষা করুন",
    "Remaining Days": "অবশিষ্ট দিন",
    "Active Plan": "সক্রিয় প্ল্যান",
    "Free Tier": "ফ্রি প্যাক",
    "Basic Desk": "বেসিক ডেস্ক",
    "Pro Desk": "প্রো ডেস্ক",
    "Elite Console": "এলিট কনসোল",
    "Upgrade Workspace": "ওয়ার্কস্পেস আপগ্রেড করুন",
    "Cancel Plan": "প্ল্যান ক্যানসেল করুন",
    "Sign Out": "লগ আউট",
    "Standalone mode is active. Local browser tools still work; server queue features are offline.": "স্ট্যান্ডঅলোন মোড সক্রিয়। ব্রাউজার টুলস কাজ করছে; সার্ভার কিউ অফলাইন।",
    "Some video and office conversions may run in fallback mode until FFmpeg/LibreOffice are enabled.": "FFmpeg বা LibreOffice সক্ষম না হওয়া পর্যন্ত কিছু ভিডিও ও ডক কনভার্শন ফলব্যাক মোডে চলতে পারে。",
    
    // Editing Window & AI Bot
    "Editing window": "এডিটিং উইন্ডো",
    "Editing Window": "এডিটিং উইন্ডো",
    "Active tool": "সক্রিয় ফিচার",
    "Use the sidebar to preview edits live, then save with Done.": "এডিটিং শেষ করতে সম্পন্ন (Done) বাটনে ক্লিক করুন ও সংরক্ষণ করুন।",
    "Live preview": "সরাসরি প্রিভিউ",
    "Reset": "রিসেট",
    "Close": "বন্ধ করুন",
    "Done": "সম্পন্ন",
    "Open": "খোলা",
    "Closed": "বন্ধ",
    "📐 Crop & Resize": "📐 ক্রপ ও রিসাইজ",
    "Crop & Resize": "ক্রপ ও রিসাইজ",
    "🎨 Background": "🎨 ব্যাকগ্রাউন্ড",
    "✂️ Aadhaar Masking": "✂️ আধার মাস্কিং",
    "Aadhaar Masking": "আধার মাস্কিং",
    "🔍 OCR & Text Extract": "🔍 OCR ও টেক্সট রিডার",
    "📋 Form Autofill": "📋 ফর্ম অটোফিল",
    "📄 PDF Tools": "📄 পিডিএফ টুলস",
    "🖼️ Image Adjustments": "🖼️ ছবি সেটিংস",
    "📱 QR Code": "📱 কিউআর কোড",
    "📤 Export & Share": "📤 এক্সপোর্ট ও শেয়ার",
    "File Nova Assistant": "ফাইল নোভা অ্যাসিস্ট্যান্ট",
    "Shortcuts": "শর্টকাট",
    "Upload": "আপলোড করা"
  },
  hi: {
    // Rule Titles
    "Scholarship ZIP Maker": "स्कॉलरशिप ज़िप मेकर",
    "Lakshmir Bhandar": "लक्ष्मी भंडार",
    "PAN Card Upload Fix": "पैन कार्ड अपलोड फिक्स",
    "College Admission ZIP": "कॉलेज एडमिशन ज़िप",
    "Job Application Pack": "जॉब एप्लीकेशन पैक",

    // Rule Descriptions
    "Income, caste, marksheet, bank passbook, photo and signature packed for scholarship portals.": "स्कॉलरशिप पोर्टल के लिए आय, जाति, मार्कशीट, बैंक पासबुक, फोटो और हस्ताक्षर को तैयार करें।",
    "Aadhaar, Swasthya Sathi, bank and photo documents validated for West Bengal scheme submission.": "पश्चिम बंगाल योजना सबमिशन के लिए आधार, स्वास्थ्य साथी, बैंक और फोटो दस्तावेजों को व्यवस्थित करें।",
    "Photo, signature and identity proof resized for PAN application portals.": "पैन आवेदन पोर्टल के लिए फोटो, हस्ताक्षर और पहचान प्रमाण का आकार बदलें।",
    "Admission form, marksheets, certificates, photo and payment proof organized for college portals.": "कॉलेज पोर्टल के लिए प्रवेश पत्र, मार्कशीट, प्रमाण पत्र, फोटो और भुगतान रसीद को व्यवस्थित करें।",
    "CV, certificates, photo, signature and identity proof prepared for job form uploads.": "नौकरी आवेदन के लिए सीवी, प्रमाण पत्र, फोटो, हस्ताक्षर और पहचान प्रमाण तैयार करें।",

    // Document checklist labels
    "Passport photo": "पासपोर्ट फोटो",
    "Applicant photo": "आवेदक की फोटो",
    "Candidate photo": "उम्मीदवार की फोटो",
    "Photo": "फोटो",
    "PAN photo": "पैन फोटो",
    "Signature": "हस्ताक्षर",
    "PAN signature": "पैन हस्ताक्षर",
    "Income certificate": "आय प्रमाण पत्र",
    "Last marksheet": "पिछली मार्कशीट",
    "Class 10 marksheet": "कक्षा 10 की मार्कशीट",
    "Class 12 marksheet": "कक्षा 12 की मार्कशीट",
    "Bank passbook": "बैंक पासबुक",
    "Aadhaar card": "आधार कार्ड",
    "Identity proof": "पहचान पत्र",
    "Swasthya Sathi card": "स्वास्थ्य साथी कार्ड",
    "Filled form": "भरा हुआ फॉर्म",
    "Payment receipt": "भुगतान रसीद",
    "Resume or CV": "बायोडाटा या सीवी",
    "Certificates": "प्रमाण पत्र",

    // Document target instructions
    "200 x 230 px, under 50KB": "200 x 230 px, 50KB से कम",
    "140 x 60 px, under 30KB": "140 x 60 px, 30KB से कम",
    "PDF under 200KB": "200KB से कम PDF",
    "Readable PDF under 300KB": "पढ़ने योग्य 300KB से कम PDF",
    "Account page only": "केवल खाता विवरण पृष्ठ",
    "Clear front and back, under 200KB": "स्पष्ट आगे और पीछे का भाग, 200KB से कम",
    "Name, IFSC and account visible": "नाम, IFSC और खाता नंबर स्पष्ट हो",
    "Passport photo under 50KB": "50KB से कम पासपोर्ट फोटो",
    "Optional supporting document": "वैकल्पिक सहायक दस्तावेज",
    "213 x 213 px JPG": "213 x 213 px JPG",
    "276 x 118 px JPG": "276 x 118 px JPG",
    "PDF under 300KB": "300KB से कम PDF",
    "Merged PDF under 500KB": "500KB से कम संयुक्त PDF",
    "Readable scan": "स्पष्ट स्कैन कॉपी",
    "Passport format": "पासपोर्ट प्रारूप",
    "Optional receipt": "वैकल्पिक रसीद",
    "PDF under 500KB": "500KB से कम PDF",
    "Transparent/white background": "पारदर्शी/सफेद पृष्ठभूमि",
    "Merged in correct order": "सही क्रम में संयुक्त",

    // Quick Action labels (Easy Access Tiles)
    "Aadhaar resize": "आधार का आकार बदलें",
    "Signature resize": "हस्ताक्षर का आकार बदलें",
    "Image compressor": "इमेज कंप्रेसर",
    "Scan cleanup": "स्कैन सॉफ़्टवेयर",
    "OCR text extraction": "OCR टेक्स्ट निष्कर्षण",
    "Auto ZIP creator": "ऑटो ज़िप निर्माता",

    // General Words and Sections
    "Easy Access Tiles": "त्वरित पहुँच टाइल्स",
    "Clickable visual shortcuts for portal uploads": "पोर्टल अपलोड के लिए क्लिक करने योग्य दृश्य शॉर्टकट",
    "Explore Features": "सुविधाओं का अन्वेषण करें",
    "Aesthetic System Launch": "प्रणाली का शुभारंभ",
    "This website is currently in its active development phase, and we sincerely apologize for any temporary layout adjustments or incomplete interfaces!": "यह वेबसाइट वर्तमान में सक्रिय विकास चरण में है, और किसी भी अस्थायी लेआउट समायोजन या अपूर्ण इंटरफेस के लिए हम क्षमाप्रार्थी हैं!",
    "You can test all of FileNova's specialized localized browser compilers & form criteria immediately!": "आप तुरंत फाइलनोवा के सभी विशेष स्थानीयकृत ब्राउज़र कंपाइलर और कस्टमाइज़ क्रॉप्स का परीक्षण कर सकते हैं!",
    "Premium quick actions": "प्रीमियम त्वरित कार्य",
    "Voice & sharing helpers": "आवाज और शेयरिंग सहायक",
    "Use voice commands or generate a secure WhatsApp share link for files without leaving the workspace.": "वर्कस्पेस छोड़े बिना वॉयस कमांड का उपयोग करें या फाइलों के लिए सुरक्षित व्हाट्सएप शेयर लिंक बनाएं।",
    "Voice commands work in English, Hindi & Bengali": "वॉयस कमांड अंग्रेजी, हिंदी और बंगाली में काम करते हैं",
    "Tap to Speak": "बोलने के लिए टैप करें",
    "Listening…": "सुन रहे हैं…",
    "Test speaker": "वक्ता का परीक्षण करें",
    "Remaining Days": "शेष दिन",
    "Active Plan": "सक्रिय प्लान",
    "Free Tier": "फ्री पैक",
    "Basic Desk": "बेसिक डेस्क",
    "Pro Desk": "प्रो डेस्क",
    "Elite Console": "एलीट कंसोल",
    "Upgrade Workspace": "वर्कस्पेस अपग्रेड करें",
    "Cancel Plan": "प्लान रद्द करें",
    "Sign Out": "लॉग आउट",
    "Standalone mode is active. Local browser tools still work; server queue features are offline.": "स्टैंडअलोन मोड सक्रिय है। स्थानीय ब्राउज़र टूल काम कर रहे हैं; सर्वर कतार ऑफ़लाइन है।",
    "Some video and office conversions may run in fallback mode until FFmpeg/LibreOffice are enabled.": "FFmpeg या LibreOffice सक्षम होने तक कुछ वीडियो और डॉक कन्वर्टर फ़ॉलबैक मोड में चलेंगे।",

    // Editing Window & AI Bot
    "Editing window": "एडिटिंग विंडो",
    "Editing Window": "एडिटिंग विंडो",
    "Active tool": "सक्रिय टूल",
    "Use the sidebar to preview edits live, then save with Done.": "बदलाव सेव करने के लिए हो गया (Done) बटन पर क्लिक करें।",
    "Live preview": "लाइव पूर्वावलोकन",
    "Reset": "रीसेट",
    "Close": "बंद करें",
    "Done": "हो गया",
    "Open": "खुला",
    "Closed": "बंद",
    "📐 Crop & Resize": "📐 क्रॉप और आकार",
    "Crop & Resize": "क्रॉप और आकार",
    "🎨 Background": "🎨 बैकग्राउंड",
    "✂️ Aadhaar Masking": "✂️ आधार मास्किंग",
    "Aadhaar Masking": "आधार मास्किंग",
    "🔍 OCR & Text Extract": "🔍 OCR और टेक्स्ट",
    "📋 Form Autofill": "📋 फॉर्म ऑटोफिल",
    "📄 PDF Tools": "📄 पीडीएफ साधन",
    "🖼️ Image Adjustments": "🖼️ इमेज एडजस्टमेंट",
    "📱 QR Code": "📱 क्यूआर कोड",
    "📤 Export & Share": "📤 एक्सपोर्ट और शेयर",
    "File Nova Assistant": "फ़ाइल नोवा असिस्टेंट",
    "Shortcuts": "शॉर्टकट",
    "Upload": "अपलोड"
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      return stored === "bn" || stored === "hi" || stored === "en" ? (stored as AppLanguage) : "en";
    } catch (e) {
      return "en";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, language);
    } catch (e) {
      // ignore
    }
  }, [language]);

  const setLanguage = (lang: AppLanguage) => setLanguageState(lang);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useTranslation() {
  const { language } = useLanguage();
  const map = translations[language] || translations.en;
  
  const tText = (text: string | null | undefined): string => {
    if (!text) return "";
    if (language === "en") return text;
    const dynamicDict = DYNAMIC_TRANSLATIONS[language];
    if (dynamicDict) {
      if (text in dynamicDict) return dynamicDict[text];
      const trimmed = text.trim();
      if (trimmed in dynamicDict) return dynamicDict[trimmed];
    }
    return text;
  };

  return { ...map, tText };
}

export default LanguageProvider;
