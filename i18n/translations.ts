export type Language = "en" | "fil";

/** BCP-47 language tag used for SpeechSynthesis voice selection. */
export const speechLang: Record<Language, string> = {
  en: "en-US",
  fil: "fil-PH",
};

/**
 * UI string dictionary. Keys are stable identifiers; values are the display
 * text per language. Phrase/category content lives in the data files and is
 * localized there.
 */
type Dict = Record<string, string>;

const en: Dict = {
  // Common
  "common.speak": "Speak",
  "common.stop": "Stop",
  "common.back": "Back",
  "common.copy": "Copy",
  "common.copied": "Copied!",
  "common.cancel": "Cancel",
  "common.loading": "Loading…",

  // Navigation
  "nav.home": "Home",
  "nav.library": "Library",
  "nav.emergency": "Emergency",
  "nav.hearing": "Hearing",
  "nav.camera": "Camera",

  // Status
  "status.online": "Online",
  "status.offlineReady": "Offline ready",
  "status.offlineBanner": "You are offline. Communication features still work.",

  // Header
  "header.settings": "Settings",

  // Onboarding
  "onb.welcomeTitle": "Welcome to Kumpas",
  "onb.welcomeMessage":
    "An offline FSL communication assistant for public service and emergencies. Grounded in RA 11106.",
  "onb.badge": "Assists communication • Works 100% Offline",
  "onb.getStarted": "Get Started",
  "onb.prefsTitle": "Choose your preferences",
  "onb.language": "Language",
  "onb.textSize": "Text size",
  "onb.sizeNormal": "Normal",
  "onb.sizeLarge": "Large",
  "onb.sizeXlarge": "Extra Large",
  "onb.sizePreview": "Sample text",
  "onb.next": "Next",
  "onb.back": "Back",
  "onb.profileTitle": "Emergency ID",
  "onb.profileContext":
    "If you are Deaf, having your ID ready helps first responders immediately.",
  "onb.name": "Name",
  "onb.contactNumber": "Emergency contact number",
  "onb.contactHint": "Enter your 10-digit mobile number (9XX XXX XXXX).",
  "onb.contactValid": "Valid number",
  "onb.contactInvalid": "Enter a valid Philippine mobile number.",
  "onb.setupLater": "Set up later in Emergency tab",
  "onb.finish": "Finish & Start Communicating",
  "onb.step": "Step",
  "onb.of": "of",

  // Home
  "home.eyebrow": "Offline-first FSL communicator",
  "home.title": "Essential communication, within reach.",
  "home.emergency": "Emergency",
  "home.phraseCategories": "Phrase categories",
  "home.moreTools": "More tools",
  "home.hearingMode": "Hearing person mode",
  "home.cameraDemo": "FSL Camera",

  // Library
  "library.title": "Phrase library",
  "library.search": "Search phrases",
  "library.all": "All",
  "library.noResults": "No phrases match your search.",
  "library.filterAria": "Filter by category",
  "library.loading": "Loading phrases…",
  "library.urgent": "Urgent",

  // Communication card
  "comm.fslPlaceholder": "FSL visual coming soon",
  "comm.fslBadge": "FSL",
  "comm.aslBadge": "ASL",
  "comm.signAlt": "Sign language demonstration for: ",

  // Hearing mode
  "hearing.title": "Hearing person mode",
  "hearing.subtitle":
    "Type a message for the Deaf person. It will be simplified into clearer text.",
  "hearing.yourMessage": "Your message",
  "hearing.placeholder":
    "e.g. Please wait outside because your document is still being processed.",
  "hearing.simplify": "Simplify",
  "hearing.original": "Original",
  "hearing.simplified": "Simplified",
  "hearing.speakSimplified": "Speak simplified",
  "hearing.suggested": "Suggested phrases",

  // Emergency
  "emergency.title": "Emergency",
  "emergency.message":
    "I am Deaf. I need help. Please contact my emergency contact.",
  "emergency.speakMessage": "Speak emergency message",
  "emergency.iAmDeaf": "I am Deaf.",
  "emergency.name": "Name",
  "emergency.contact": "Emergency contact",
  "emergency.contactName": "Emergency contact name",
  "emergency.contactNumber": "Emergency contact number",
  "emergency.medicalNote": "Medical note",
  "emergency.addressNote": "Address / barangay note",
  "emergency.address": "Address / barangay",
  "emergency.editProfile": "Edit profile",
  "emergency.setupTitle": "Set up your emergency profile",
  "emergency.editTitle": "Edit profile",
  "emergency.saveProfile": "Save profile",

  // Camera
  "camera.title": "Sign Language Recognition",
  "camera.start": "Start camera",
  "camera.stop": "Stop camera",
  "camera.detectedSign": "Detected sign",
  "camera.confidence": "Confidence",
  "camera.outputPhrase": "Output phrase",
  "camera.speakOutput": "Speak output",
  "camera.cameraOff": "Camera is off. Press Start to begin the demo.",
  "camera.notAvailable": "Camera is not available on this device.",
  "camera.denied": "Camera permission was denied or is unavailable.",
  "camera.confLow": "low",
  "camera.confMedium": "medium",
  "camera.confHigh": "high",
  "camera.loadingModel": "Loading sign recognition model…",
  "camera.modelError": "Could not load the sign recognition model.",
  "camera.waitingForSign": "Show a sign to the camera…",
  "camera.detecting": "Detecting…",
  "camera.noHand": "No hand detected",
  "camera.handDetected": "Hand detected",
  "camera.useMock": "Use demo mode",
  "camera.useReal": "Use real recognition",

  // Settings
  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.light": "light",
  "settings.dark": "dark",
  "settings.system": "system",
  "settings.language": "Language",
  "settings.langEnglish": "English",
  "settings.langFilipino": "Filipino",
  "settings.emergencyProfile": "Emergency profile",
  "settings.editEmergencyProfile": "Edit emergency profile",
  "settings.speech": "Speech",
  "settings.testSpeech": "Test speech",
  "settings.speechTestText": "This is a Kumpas speech test.",
  "settings.voiceWarning":
    "Filipino speech uses an online voice for natural pronunciation. When offline, it falls back to your device's closest available voice, which may sound imperfect.",
  "settings.data": "Data",
  "settings.clearData": "Clear local data",
  "settings.dataCleared": "Local data cleared.",
  "settings.confirmClear":
    "Clear all local data? This removes your emergency profile and settings, and returns to the setup screen.",
  "settings.restartSetup": "Restart setup",
  "settings.confirmRestart":
    "Restart setup? This clears your data and takes you back to the welcome screens.",
  "settings.tagline": "Kumpas — offline-first FSL communicator",
  "settings.version": "Version",

  // Not found
  "notFound.title": "Page not found",
  "notFound.body": "That page does not exist. Let's get you back.",
  "notFound.goHome": "Go home",

  // Speak button
  "speak.notAvailable": "Speech is not available on this device.",
};

const fil: Dict = {
  // Common
  "common.speak": "Sabihin",
  "common.stop": "Itigil",
  "common.back": "Bumalik",
  "common.copy": "Kopyahin",
  "common.copied": "Nakopya!",
  "common.cancel": "Kanselahin",
  "common.loading": "Naglo-load…",

  // Navigation
  "nav.home": "Home",
  "nav.library": "Aklatan",
  "nav.emergency": "Help",
  "nav.hearing": "Pang-nakaririnig",
  "nav.camera": "Kumpas Mode",

  // Status
  "status.online": "Online",
  "status.offlineReady": "Handa offline",
  "status.offlineBanner":
    "Offline ka. Gumagana pa rin ang mga tampok sa pakikipag-usap.",

  // Header
  "header.settings": "Mga Setting",

  // Onboarding
  "onb.welcomeTitle": "Maligayang pagdating sa Kumpas",
  "onb.welcomeMessage":
    "Isang offline na FSL communication assistant para sa serbisyo publiko at emerhensiya. Batay sa RA 11106.",
  "onb.badge": "Tumutulong sa komunikasyon • Gumagana 100% Offline",
  "onb.getStarted": "Magsimula",
  "onb.prefsTitle": "Piliin ang wika at sukat ng teksto",
  "onb.language": "Wika",
  "onb.textSize": "Sukat ng teksto",
  "onb.sizeNormal": "Normal",
  "onb.sizeLarge": "Malaki",
  "onb.sizeXlarge": "Napakalaki",
  "onb.sizePreview": "Halimbawang teksto",
  "onb.next": "Kasunod",
  "onb.back": "Bumalik",
  "onb.profileTitle": "Emergency ID",
  "onb.profileContext":
    "Kung ikaw ay Bingi, ang pagkakaroon ng handa mong ID ay agad na nakakatulong sa mga first responder.",
  "onb.name": "Pangalan",
  "onb.contactNumber": "Numero ng tatawagan sa emerhensiya",
  "onb.contactHint": "Ilagay ang iyong 10-digit na numero (9XX XXX XXXX).",
  "onb.contactValid": "Wastong numero",
  "onb.contactInvalid": "Maglagay ng wastong numero ng mobile sa Pilipinas.",
  "onb.setupLater": "I-set up mamaya sa Emergency tab",
  "onb.finish": "Simulan na",
  "onb.step": "Hakbang",
  "onb.of": "ng",

  // Home
  "home.eyebrow": "Offline-first na FSL communicator",
  "home.title": "Mahalagang komunikasyon, abot-kamay.",
  "home.emergency": "Help",
  "home.phraseCategories": "Mga kategorya ng parirala",
  "home.moreTools": "Iba pang kagamitan",
  "home.hearingMode": "Pang-nakaririnig",
  "home.cameraDemo": "FSL Camera",

  // Library
  "library.title": "Aklatan ng parirala",
  "library.search": "Maghanap ng parirala",
  "library.all": "Lahat",
  "library.noResults": "Walang pariralang tumugma sa iyong paghahanap.",
  "library.filterAria": "Salain ayon sa kategorya",
  "library.loading": "Naglo-load ng mga parirala…",
  "library.urgent": "Agaran",

  // Communication card
  "comm.fslPlaceholder": "Malapit nang dumating ang FSL visual",
  "comm.fslBadge": "FSL",
  "comm.aslBadge": "ASL",
  "comm.signAlt": "Pagpapakita ng sign language para sa: ",

  // Hearing mode
  "hearing.title": "Pang-nakaririnig",
  "hearing.subtitle":
    "Mag-type ng mensahe para sa Bingi. Pasisimplehin ito sa mas malinaw na teksto.",
  "hearing.yourMessage": "Iyong mensahe",
  "hearing.placeholder":
    "hal. Pakihintay sa labas dahil pinoproseso pa ang iyong dokumento.",
  "hearing.simplify": "Pasimplehin",
  "hearing.original": "Orihinal",
  "hearing.simplified": "Pinasimple",
  "hearing.speakSimplified": "Sabihin ang pinasimple",
  "hearing.suggested": "Mga iminumungkahing parirala",

  // Emergency
  "emergency.title": "Help",
  "emergency.message":
    "Bingi ako. Kailangan ko ng tulong. Pakitawagan ang aking emergency contact.",
  "emergency.speakMessage": "Sabihin ang mensahe ng emerhensiya",
  "emergency.iAmDeaf": "Bingi ako.",
  "emergency.name": "Pangalan",
  "emergency.contact": "Taong tatawagan sa emerhensiya",
  "emergency.contactName": "Pangalan ng tatawagan",
  "emergency.contactNumber": "Numero ng tatawagan",
  "emergency.medicalNote": "Tala sa medikal",
  "emergency.addressNote": "Tala sa address / barangay",
  "emergency.address": "Address / barangay",
  "emergency.editProfile": "I-edit ang profile",
  "emergency.setupTitle": "I-set up ang iyong emergency profile",
  "emergency.editTitle": "I-edit ang profile",
  "emergency.saveProfile": "I-save ang profile",

  // Camera
  "camera.title": "Kumpas Mode",
  "camera.start": "Simulan ang kamera",
  "camera.stop": "Itigil ang kamera",
  "camera.detectedSign": "Natukoy na senyas",
  "camera.confidence": "Kumpiyansa",
  "camera.outputPhrase": "Lumabas na parirala",
  "camera.speakOutput": "Sabihin ang resulta",
  "camera.cameraOff": "Naka-off ang kamera. Pindutin ang Simulan upang magsimula.",
  "camera.notAvailable": "Hindi available ang kamera sa device na ito.",
  "camera.denied": "Tinanggihan o hindi available ang pahintulot sa kamera.",
  "camera.confLow": "mababa",
  "camera.confMedium": "katamtaman",
  "camera.confHigh": "mataas",
  "camera.loadingModel": "Naglo-load ng sign recognition model…",
  "camera.modelError": "Hindi ma-load ang sign recognition model.",
  "camera.waitingForSign": "Magpakita ng senyas sa kamera…",
  "camera.detecting": "Tinutukoy…",
  "camera.noHand": "Walang natukoy na kamay",
  "camera.handDetected": "May natukoy na kamay",
  "camera.useMock": "Gamitin ang demo mode",
  "camera.useReal": "Gamitin ang totoong pagkilala",

  // Settings
  "settings.title": "Mga Setting",
  "settings.theme": "Tema",
  "settings.light": "maliwanag",
  "settings.dark": "madilim",
  "settings.system": "sistema",
  "settings.language": "Wika",
  "settings.langEnglish": "English",
  "settings.langFilipino": "Filipino",
  "settings.emergencyProfile": "Profile sa emerhensiya",
  "settings.editEmergencyProfile": "I-edit ang emergency profile",
  "settings.speech": "Pagsasalita",
  "settings.testSpeech": "Subukan ang pagsasalita",
  "settings.speechTestText": "Ito ay isang pagsubok sa pagsasalita ng Kumpas.",
  "settings.voiceWarning":
    "Gumagamit ang Filipino na pagsasalita ng online na boses para sa natural na pagbigkas. Kapag offline, babalik ito sa pinakamalapit na boses ng iyong device na maaaring hindi perpekto ang tunog.",
  "settings.data": "Datos",
  "settings.clearData": "Burahin ang lokal na datos",
  "settings.dataCleared": "Nabura ang lokal na datos.",
  "settings.confirmClear":
    "Burahin ang lahat ng lokal na datos? Aalisin nito ang iyong emergency profile at mga setting, at babalik sa setup screen.",
  "settings.restartSetup": "I-restart ang setup",
  "settings.confirmRestart":
    "I-restart ang setup? Buburahin nito ang iyong datos at babalik ka sa welcome screens.",
  "settings.tagline": "Kumpas — offline-first na FSL communicator",
  "settings.version": "Bersyon",

  // Not found
  "notFound.title": "Hindi nahanap ang pahina",
  "notFound.body": "Wala ang pahinang iyon. Ibalik ka namin.",
  "notFound.goHome": "Bumalik sa home",

  // Speak button
  "speak.notAvailable": "Hindi available ang pagsasalita sa device na ito.",
};

export const translations: Record<Language, Dict> = { en, fil };
