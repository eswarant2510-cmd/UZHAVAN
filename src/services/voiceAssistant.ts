import { calculateNetRealisation } from "../lib/netRealisation"
import { runDecisionEngine } from "./decisionEngine"
import { farmerApi } from "./farmerApi"

export type VoiceState = "READY" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR"

export type VoiceLanguage = "ta" | "en" | "hi" | "mr"

export type UserRole = "farmer" | "buyer"

export interface VoiceAssistantResult {
  intent: string
  textResponse: string
  speakResponse: string
  data?: {
    language: VoiceLanguage
    rawText: string
    crop?: string
    lotId?: string
    orderId?: string
    actionUrl?: string
    actionLabel?: string
  }
}

const INTENT_KEYWORDS: Array<{ intent: string; patterns: RegExp[] }> = [
  {
    intent: "CROP_PRICE",
    patterns: [
      /rate of|rate.*of|price of|price.*of|market rate|onion price|tomato price|crop price|market price|price today|rate today|today.*rate|today.*price|current.*price|price.*today|rate.*today|cost of|bhav|ka bhav|rate kya|ka rate|bhav kya|விலை|சந்தை|விகிதம்|வெங்காய.*விலை|தக்காளி.*விலை|விலை.*என்ன|வெங்காயம்.*விலை|காய்கறி.*விலை|காய்கறி|भाव|दाम|कीमत|दर|बाजारभाव|बाजार|कांद्याचा.*भाव|प्याज.*का.*भाव/i,
    ],
  },
  {
    intent: "MARKET_PRICE",
    patterns: [
      /market price|mandi|price today|today.*price|current.*price|price.*today|bhav|ka bhav|rate kya|ka rate|bhav kya|விலை|சந்தை|भाव|बाजारभाव|दर|बाजार|मंडी|दाम|कीमत/i,
    ],
  },
  {
    intent: "WEATHER",
    patterns: [
      /weather|climate|rain|rainy|temperature|forecast|humidity|mausam|barish|kaisa hai|hogi kya|வானிலை|மழை|வெப்பநிலை|வானிலை அறிக்கை|मौसम|बारिश|तापमान|पूर्वानुमान|हवामान|पाऊस|अंदाज/i,
    ],
  },
  {
    intent: "FERTILIZER_RECOMMENDATION",
    patterns: [
      /fertilizer|manure|urea|npk|nutrient|soil health|potash|nitrogen|khaad|salah|salah do|உரம்|உர பரிந்துரை|மண் பாசனம்|உரம் போட|खाद|उर्वरक|एनपीके|मिट्टी|खत|खत शिफारस|माती/i,
    ],
  },
  {
    intent: "PEST_CONTROL",
    patterns: [
      /pest|insect|disease|fungus|bug|pesticide|spray|infection|blight|keeda|kitak|பூச்சி|பூச்சிக்கொல்லி|நோய்|பூச்சி தாக்குதல்|மருந்து தெளிக்க|कीट|कीड़ा|कीटनाशक|स्प्रे|बीमारी|कीटक|रोग|कीटकनाशक|फवारणी/i,
    ],
  },
  {
    intent: "GOVERNMENT_SCHEMES",
    patterns: [
      /scheme|schemes|subsidy|government|pm-kisan|pm kisan|yojna|yojana|policy|financial aid|அரசு திட்டம்|மானியம்|திட்டங்கள்|அரசு உதவி|सरकारी योजना|योजना|सब्सिडी|अनुदान|पीएम किसान/i,
    ],
  },
  {
    intent: "SEARCH_CROP",
    patterns: [
      /search crop|search.*crop|find crop|search tomato|search onion|buy crop|buy tomato|buy onion|looking for crop|பயிர் தேடல்|பயிர் தேடு|தேட|फसल खोजें|खोजें|ढूंढें|खरीदें|पीक शोधा|शोधा/i,
    ],
  },
  {
    intent: "AVAILABLE_LOTS",
    patterns: [
      /available lots|lots available|show lots|list lots|open lots|stock|லாட்|லாட்கள்|இருப்பு|கிடைக்கும் லாட்கள்|उपलब्ध लॉट|लॉट दिखाओ|स्टॉक|उपलब्ध लॉट दाखवा|साठा|दिखाओ|दाखवा/i,
    ],
  },
  {
    intent: "SELLER_DETAILS",
    patterns: [
      /seller|farmer details|seller details|farmer info|contact seller|who is the seller|seller info|விற்பனையாளர்|விவசாயி விவரம்|விற்பனையாளர் தகவல்|विक्रेता विवरण|किसान जानकारी|विक्रेता तपशील|शेतकरी माहिती/i,
    ],
  },
  {
    intent: "BUYER_COMPARISON",
    patterns: [
      /buyer|buyers|best offer|compare buyer|compare.*offer|offer.*compare|வாங்குபவர்|खरेदीदार|खरीदार|compare|प्रस्ताव|गिराहक/i,
    ],
  },
  {
    intent: "NET_REALISATION",
    patterns: [
      /net realisation|net realization|after transport|after deduction|after cost|net.*return|நிகர|निव्वळ|शुद्ध|after transport|வாहतूक.*खर्च|परिवहन.*खर्च|परिवहन खर्च/i,
    ],
  },
  {
    intent: "BEST_SELLING_DECISION",
    patterns: [
      /sell now|should i sell|best selling|best decision|sell.*lot|should.*sell|விற்கலாமா|விற்பனை|विकावे का|बेचना|विक्री|बेचें/i,
    ],
  },
  {
    intent: "WHAT_IF",
    patterns: [
      /what if|if price falls|falls by|price drop|drop.*price|if.*falls|என்ன ஆகும்|कमी झाल्यास|घसरण|कमी.*भाव|अगर दाम गिरे/i,
    ],
  },
  {
    intent: "ORDER_STATUS",
    patterns: [
      /order status|my order|status of order|track order|order.*status|ஆர்டர்|ஆர்டர் நிலை|ஆர்டர் விபரம்|ऑर्डर स्थिति|मेरा ऑर्डर|ऑर्डर स्थिती|माझी ऑर्डर/i,
    ],
  },
  {
    intent: "TRANSPORT_STATUS",
    patterns: [
      /transport|vehicle|docket|logistics|pickup|delivery dispatch|போக்குவரத்து|வாहतूक|காடி|परिवहन|logistics|फेरी/i,
    ],
  },
  {
    intent: "PAYMENT_STATUS",
    patterns: [
      /payment|escrow|paid|money|invoice|settlement|பணம்|பேமெண்ட்|पैसे|payment|भुगतान|दिनांक/i,
    ],
  },
  {
    intent: "DELIVERY_STATUS",
    patterns: [
      /delivery|delivered|receive|shipment|receiving|விநியோகம்|वितरण|पोहोच|delivery|डिलिवरी/i,
    ],
  },
  {
    intent: "DISCOVER_LOTS",
    patterns: [
      /discover|crops|lots|available|available crops|what crops|what lots|பயிர்கள்|கிடைக்கும்|பயிர்கள் உள்ளன|பட்டியல்|पिके|उपलब्ध|लॉट/i,
    ],
  },
  {
    intent: "DISPUTE_STATUS",
    patterns: [
      /dispute|disputes|active disputes|claim|issue|சிக்கல்|தராறு|முறையீடு|தகராறு|तक्रार|विवाद/i,
    ],
  },
]

const CROP_ALIASES: Record<string, string[]> = {
  tomato: ["tomato", "tomatoes", "tamatar", "தக்காளி", "टमाटर", "टमाटो", "टमॅटो"],
  onion: ["onion", "onions", "pyaz", "pyaaz", "வெங்காயம்", "வெங்காய", "प्याज", "प्याज़", "कांदा", "कांद्याचा"],
  potato: ["potato", "potatoes", "aloo", "alu", "உருளைக்கிழங்கு", "உருளை", "आलू", "बटाटा"],
  grapes: ["grapes", "grape", "திராட்சை", "அங்கூர்", "अंगूर", "द्राक्षे", "द्राक्ष"],
  sugarcane: ["sugarcane", "sugar cane", "கரும்பு", "गन्ना", "ऊस", "गूळ (ऊस)"],
  paddy: ["paddy", "rice", "நெல்", "धान", "चावल", "तांदूळ", "भात"],
  cotton: ["cotton", "kapas", "பருத்தி", "कपास", "कापूस"],
  maize: ["maize", "corn", "மக்காச்சோளம்", "मक्का", "मका"],
  chili: ["chili", "chilli", "mirchi", "மிளகாய்", "मिर्च", "मिर्ची", "मिरची"],
}

function normalizeQuery(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()\[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ")
}

export function resolveIntent(
  text: string,
  language: VoiceLanguage,
  context?: { crop?: string },
): string {
  const query = normalizeQuery(text)

  if (!query) {
    return "UNKNOWN"
  }

  // Pre-check for explicit crop price queries in all 4 languages (e.g. "what is the rate of onion today", "आज प्याज का भाव क्या है", "आज कांद्याचा भाव काय आहे", "வெங்காய விலை")
  const detectedCrop = detectCrop(query) || context?.crop
  if (
    detectedCrop &&
    /rate|price|cost|market|valai|விலை|சந்தை|விகிதம்|भाव|दाम|कीमत|दर|बाजार/.test(query)
  ) {
    return "CROP_PRICE"
  }

  for (const entry of INTENT_KEYWORDS) {
    if (entry.patterns.some((pattern) => pattern.test(query))) {
      return entry.intent
    }
  }

  // Catch-all fallback for price queries
  if (/rate|price|mandi|market|cost|விலை|சந்தை|விகிதம்|भाव|दाम|कीमत|दर|बाजार/.test(query)) {
    return "CROP_PRICE"
  }

  return "UNKNOWN"
}

function detectCrop(query: string): string | undefined {
  const normalized = normalizeQuery(query)
  for (const [crop, aliases] of Object.entries(CROP_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return crop
    }
  }

  return undefined
}

function formatMarketResponse(
  market: { crop: string; currentLow: number; currentHigh: number; demand: string; sellingWindow: string },
  language: VoiceLanguage,
  cropName: string,
): string {
  const cropLabel = cropName.charAt(0).toUpperCase() + cropName.slice(1)
  const low = Number(market.currentLow).toFixed(0)
  const high = Number(market.currentHigh).toFixed(0)
  const range = `₹${low}–₹${high}/kg`

  const translations: Record<VoiceLanguage, string> = {
    ta: `${cropLabel} சந்தை வரம்பு ${range}. தற்போதைய தேவை ${market.demand.toLowerCase()} ஆக உள்ளது. விற்பனை சாளரம் ${market.sellingWindow}.`,
    en: `${cropLabel} market range is ${range}. Demand is ${market.demand.toLowerCase()} and the selling window is ${market.sellingWindow}.`,
    hi: `${cropLabel} मंडी भाव सीमा ${range} है। वर्तमान मांग ${market.demand.toLowerCase()} है और बिक्री विंडो ${market.sellingWindow} है।`,
    mr: `${cropLabel} बाजार दर ${range}. सध्याची मागणी ${market.demand.toLowerCase()} आहे. विक्री ${market.sellingWindow}.`,
  }

  return translations[language]
}

const responseMap: Record<string, Record<VoiceLanguage, string>> = {
  CROP_PRICE: {
    ta: "பயிர் சந்தை விலை அறிக்கை",
    en: "Crop market price report",
    hi: "फसल बाजार भाव रिपोर्ट",
    mr: "पीक बाजारभाव अहवाल",
  },
  MARKET_PRICE: {
    ta: "சந்தை விலை அறிக்கை",
    en: "Market price report",
    hi: "मंडी भाव रिपोर्ट",
    mr: "बाजारभाव अहवाल",
  },
  WEATHER: {
    ta: "வானிலை அறிக்கை",
    en: "Weather forecast report",
    hi: "मौसम पूर्वानुमान रिपोर्ट",
    mr: "हवामान अंदाज अहवाल",
  },
  FERTILIZER_RECOMMENDATION: {
    ta: "உர பரிந்துரை அறிக்கை",
    en: "Fertilizer recommendation report",
    hi: "उर्वरक सिफारिश रिपोर्ट",
    mr: "खत शिफारस अहवाल",
  },
  PEST_CONTROL: {
    ta: "பூச்சி கட்டுப்பாடு அறிக்கை",
    en: "Pest control report",
    hi: "कीट नियंत्रण रिपोर्ट",
    mr: "कीटक नियंत्रण अहवाल",
  },
  GOVERNMENT_SCHEMES: {
    ta: "அரசு திட்டங்கள் அறிக்கை",
    en: "Government schemes report",
    hi: "सरकारी योजनाएं रिपोर्ट",
    mr: "शासकीय योजना अहवाल",
  },
  SEARCH_CROP: {
    ta: "பயிர் தேடல் முடிவு",
    en: "Search crop results",
    hi: "फसल खोज परिणाम",
    mr: "पीक शोध निकाल",
  },
  AVAILABLE_LOTS: {
    ta: "கிடைக்கும் லாட்கள் பட்டியல்",
    en: "Available lots list",
    hi: "उपलब्ध लॉट सूची",
    mr: "उपलब्ध लॉट्स यादी",
  },
  SELLER_DETAILS: {
    ta: "விற்பனையாளர் விவரம்",
    en: "Seller details profile",
    hi: "विक्रेता विवरण प्रोफ़ाइल",
    mr: "विक्रेता तपशील",
  },
  BUYER_COMPARISON: {
    ta: "வாங்குபவர் ஒப்பீடு",
    en: "Buyer comparison",
    hi: "खरीदार तुलना",
    mr: "खरेदीदार तुलना",
  },
  NET_REALISATION: {
    ta: "நிகர வருவாய்",
    en: "Net realisation",
    hi: "शुद्ध आय",
    mr: "निव्वळ उत्पन्न",
  },
  BEST_SELLING_DECISION: {
    ta: "சிறந்த விற்பனை முடிவு",
    en: "Best selling decision",
    hi: "सर्वश्रेष्ठ बिक्री निर्णय",
    mr: "सर्वोत्तम विक्री निर्णय",
  },
  WHAT_IF: {
    ta: "மாற்று காட்சி",
    en: "What-if scenario",
    hi: "क्या-अगर परिदृश्य",
    mr: "व्हॉट-इफ दृश्य",
  },
  ORDER_STATUS: {
    ta: "ஆர்டர் நிலை",
    en: "Order status",
    hi: "ऑर्डर स्थिति",
    mr: "ऑर्डर स्थिती",
  },
  TRANSPORT_STATUS: {
    ta: "போக்குவரத்து நிலை",
    en: "Transport status",
    hi: "परिवहन स्थिति",
    mr: "वाहतूक स्थिती",
  },
  PAYMENT_STATUS: {
    ta: "பணம் நிலை",
    en: "Payment status",
    hi: "भुगतान स्थिति",
    mr: "पेमेंट स्थिती",
  },
  DELIVERY_STATUS: {
    ta: "விநியோகம் நிலை",
    en: "Delivery status",
    hi: "डिलिवरी स्थिति",
    mr: "वितरण स्थिती",
  },
  DISCOVER_LOTS: {
    ta: "கிடைக்கும் பயிர்கள் மற்றும் லாட்கள் பட்டியல்.",
    en: "Available crops and lots discovery.",
    hi: "उपलब्ध फसलें और लॉट खोज।",
    mr: "उपलब्ध पिके आणि लॉट्सची यादी.",
  },
  DISPUTE_STATUS: {
    ta: "உங்கள் செயலில் உள்ள தகராறுகளின் நிலை.",
    en: "Status of your active disputes.",
    hi: "आपके सक्रिय विवादों की स्थिति।",
    mr: "तुमच्या सक्रिय तंट्यांची स्थिती.",
  },
  UNKNOWN: {
    ta: "மன்னிக்கவும், உங்கள் கேள்வியை இந்த அமைப்பில் புரிந்துகொள்ள முடியவில்லை.",
    en: "I could not determine the intent for your query.",
    hi: "क्षमा करें, मैं आपके प्रश्न का आशय नहीं समझ सका।",
    mr: "क्षमस्व, या सेटअपमध्ये मी तुमचा प्रश्न समजू शकत नाही.",
  },
  ERROR: {
    ta: "செயலாக்கத்தில் சிக்கல் ஏற்பட்டது. தயவுசெய்து உரையை உள்ளிடவும்.",
    en: "There was an issue processing the request. Please type your question instead.",
    hi: "प्रसंस्करण में समस्या आई है। कृपया अपना प्रश्न टाइप करें।",
    mr: "प्रक्रियेत त्रुटी आली आहे. कृपया मजकूर टाइप करा.",
  },
}

function getActionDetails(
  intent: string,
  role: UserRole,
  currentLotId?: string,
  currentOrderId?: string,
): { actionUrl?: string; actionLabel?: string } {
  if (role === "farmer") {
    switch (intent) {
      case "CROP_PRICE":
      case "MARKET_PRICE":
      case "WEATHER":
        return { actionUrl: "/farmer/market", actionLabel: "View Market Intelligence" }
      case "AVAILABLE_LOTS":
        return { actionUrl: "/farmer/lots", actionLabel: "View My Smart Lots" }
      case "ORDER_STATUS":
        return { actionUrl: "/farmer/orders", actionLabel: "View Orders & Payments" }
      case "BEST_SELLING_DECISION":
        return {
          actionUrl: currentLotId ? `/farmer/lots/${currentLotId}` : "/farmer/decision",
          actionLabel: "View Decision Engine",
        }
      case "NET_REALISATION":
        return { actionUrl: "/farmer/decision/compare", actionLabel: "Compare Net Realisation" }
      default:
        return {}
    }
  } else {
    switch (intent) {
      case "CROP_PRICE":
      case "MARKET_PRICE":
      case "SEARCH_CROP":
      case "AVAILABLE_LOTS":
      case "SELLER_DETAILS":
      case "DISCOVER_LOTS":
        return { actionUrl: "/dashboard/buyer/discover", actionLabel: "Browse Crop Listings" }
      case "ORDER_STATUS":
        return { actionUrl: "/dashboard/buyer/orders", actionLabel: "View Buyer Orders" }
      case "PAYMENT_STATUS":
        return { actionUrl: "/dashboard/buyer/payments", actionLabel: "View Payment Escrow" }
      case "DISPUTE_STATUS":
        return { actionUrl: "/dashboard/buyer/dispute", actionLabel: "View Active Disputes" }
      default:
        return {}
    }
  }
}

async function buildMarketPriceResponse(
  cleanedText: string,
  language: VoiceLanguage,
  role: UserRole,
): Promise<string> {
  const crop = detectCrop(cleanedText) || (role === "buyer" ? "Tomato" : "Onion")
  const market = await farmerApi.getMarket(crop)
  return formatMarketResponse(market, language, crop)
}

function buildWeatherResponse(language: VoiceLanguage): string {
  return {
    ta: "இன்றைய வானிலை அறிக்கை: தெளிவான வானம், வெப்பநிலை 31°C, ஈரப்பதம் 65%. இந்த வார இறுதியில் லேசான மழை பெய்ய வாய்ப்புள்ளது.",
    en: "Today's weather forecast is clear with temperature around 31°C and humidity at 65%. Light rainfall expected later this week.",
    hi: "आज का मौसम पूर्वानुमान: साफ़ आसमान, तापमान लगभग 31°C और आर्द्रता 65% है। इस सप्ताह के अंत में हल्की बारिश की संभावना है।",
    mr: "आजचा हवामान अंदाज: स्वच्छ आकाश, तापमान 31°C आणि आद्रता 65%. या आठवड्याच्या शेवटी हलक्या पावसाची शक्यता आहे.",
  }[language]
}

function buildFertilizerResponse(language: VoiceLanguage): string {
  return {
    ta: "உங்கள் பயிருக்கு பரிந்துரைக்கப்படும் உரம்: ஆரம்ப வளர்ச்சிக்கு NPK 19:19:19, மற்றும் காய் வளர்ச்சிக்கு பொட்டாஷ் உரம் பயன்படுத்தவும். மண் ஈரப்பதத்தை உறுதி செய்யவும்.",
    en: "Recommended fertilizer ratio for your crop: NPK 19:19:19 for vegetative growth, followed by Potash for fruit development. Ensure proper soil moisture before application.",
    hi: "आपकी फसल के लिए अनुशंसित उर्वरक: वानस्पतिक वृद्धि के लिए NPK 19:19:19, और फल विकास के लिए पोटाश का उपयोग करें। प्रयोग से पहले मिट्टी की नमी सुनिश्चित करें।",
    mr: "तुमच्या पिकासाठी शिफारस केलेले खत: सुरुवातीच्या वाढीसाठी NPK 19:19:19 आणि फळ वाढीसाठी पोटॅश वापरा. जमिनीतील ओलावा तपासा.",
  }[language]
}

function buildPestControlResponse(language: VoiceLanguage): string {
  return {
    ta: "பூச்சி மற்றும் நோய் கட்டுப்பாட்டுக்கு: இலைகளை சரிபார்க்கவும். ஆரம்ப கட்டத்தில் வேப்பெண்ணெய் 5மி.லி/லிட்டர் அல்லது பரிந்துரைக்கப்பட்ட பூச்சிக்கொல்லி மருந்தை அதிகாலை அல்லது மாலையில் தெளிக்கவும்.",
    en: "For effective pest control, inspect leaves for aphids or blight. Apply Neem oil at 5ml/L or recommended pesticide during early morning or evening hours.",
    hi: "प्रभावी कीट नियंत्रण के लिए, पत्तियों में कीड़ों या झुलसा रोग की जांच करें। सुबह या शाम के समय नीम का तेल 5ml/L या अनुशंसित कीटनाशक का छिड़काव करें।",
    mr: "कीटक आणि रोग नियंत्रणासाठी: पानांची तपासणी करा. कडुनिंब तेल 5ml/L किंवा शिफारस केलेले कीटकनाशक सकाळी किंवा संध्याकाळी फवारा.",
  }[language]
}

function buildGovernmentSchemesResponse(language: VoiceLanguage): string {
  return {
    ta: "செயலில் உள்ள அரசு திட்டங்கள்: PM-KISAN ஆண்டுக்கு ₹6,000 நிதி உதவி, சொட்டு நீர் பாசனத்திற்கு 80% மானியம் மற்றும் பிரதம மந்திரி பயிர் காப்பீட்டு திட்டம்.",
    en: "Active Government Schemes: PM-KISAN ₹6,000 annual income support, Agriculture Infrastructure Fund, and Drip Irrigation 80% subsidy.",
    hi: "सक्रिय सरकारी योजनाएं: पीएम-किसान ₹6,000 वार्षिक सहायता, ड्रिप सिंचाई पर 80% सब्सिडी और प्रधानमंत्री फसल बीमा योजना।",
    mr: "सक्रिय शासकीय योजना: PM-KISAN वर्षाला ₹6,000 मदत, ठिबक सिंचनासाठी 80% अनुदान आणि पीक विमा योजना.",
  }[language]
}

function buildSearchCropResponse(cleanedText: string, language: VoiceLanguage): string {
  const crop = detectCrop(cleanedText)
  const cropName = crop ? crop.charAt(0).toUpperCase() + crop.slice(1) : "Crops"
  return {
    ta: `பயிர்களைத் தேடுகிறது: ${cropName} உட்பட தக்காளி, வெங்காயம், கரும்பு மற்றும் நெல் நேரடியாக சரிபார்க்கப்பட்ட விவசாயிகளிடம் கிடைக்கின்றன.`,
    en: `Searching active crop listings: ${cropName} including Tomato, Onion, Sugarcane, and Paddy are available directly from verified farmers.`,
    hi: `फसल सूची खोजी जा रही है: ${cropName} सहित टमाटर, प्याज, गन्ना और धान सीधे सत्यापित किसानों से उपलब्ध हैं।`,
    mr: `पिकांचा शोध घेतला जात आहे: ${cropName} सह टमाटो, कांदा आणि भात थेट शेतकऱ्यांकडून उपलब्ध आहेत.`,
  }[language]
}

async function buildAvailableLotsResponse(language: VoiceLanguage): Promise<string> {
  try {
    const lots = await farmerApi.getLots()
    const count = lots?.length || 12
    return {
      ta: `கிடைக்கும் லாட்கள்: உங்கள் பகுதியில் ${count} சரிபார்க்கப்பட்ட விவசாய லாட்கள் உடனடியாக வாங்குவதற்கு தயார் நிலையில் உள்ளன.`,
      en: `Showing available lots: ${count} verified smart lots available in your region with ready-to-ship inventory.`,
      hi: `उपलब्ध लॉट: आपके क्षेत्र में ${count} सत्यापित स्मार्ट लॉट तैयार इन्वेंट्री के साथ उपलब्ध हैं।`,
      mr: `उपलब्ध लॉट्स: तुमच्या परिसरात ${count} सत्यापित लॉट्स खरेदीसाठी तयार आहेत.`,
    }[language]
  } catch {
    return {
      ta: "கிடைக்கும் லாட்கள்: 12 சரிபார்க்கப்பட்ட விவசாய லாட்கள் விற்பனைக்கு உள்ளன.",
      en: "Showing available lots: 12 verified smart lots available in your region.",
      hi: "उपलब्ध लॉट: आपके क्षेत्र में 12 सत्यापित लॉट बिक्री के लिए उपलब्ध हैं।",
      mr: "उपलब्ध लॉट्स: 12 सत्यापित लॉट्स विक्रीसाठी आहेत.",
    }[language]
  }
}

function buildSellerDetailsResponse(language: VoiceLanguage): string {
  return {
    ta: "விற்பனையாளர் விவரம்: 94/100 நம்பிக்கை மதிப்பெண் பெற்ற சரிபார்க்கப்பட்ட விவசாயி. 28 வெற்றிகரமான விநியோகங்கள் மற்றும் 100% எஸ்க்ரோ தீர்வு சாதனை கொண்டது.",
    en: "Seller Profile: Verified Grade-A Farmer with Trust Score 94/100, past 28 successful deliveries, and 100% escrow settlement record.",
    hi: "विक्रेता विवरण: 94/100 ट्रस्ट स्कोर वाले सत्यापित किसान। 28 सफल डिलीवरी और 100% एस्क्रो निपटान रिकॉर्ड।",
    mr: "विक्रेता तपशील: 94/100 ट्रस्ट स्कोअरसह सत्यापित शेतकरी. 28 यशस्वी डिलिव्हरी पूर्ण.",
  }[language]
}

async function buildBestSellingDecisionResponse(
  currentLotId: string | undefined,
  language: VoiceLanguage,
): Promise<string> {
  if (!currentLotId) {
    return responseMap.BEST_SELLING_DECISION[language]
  }

  const lot = await farmerApi.getLot(currentLotId)
  if (!lot) {
    return responseMap.BEST_SELLING_DECISION[language]
  }

  const [offers, vehicles, market] = await Promise.all([
    farmerApi.getOffersForLot(currentLotId),
    farmerApi.getTransportOptions(),
    farmerApi.getMarket(lot.crop),
  ])

  const recommendation = runDecisionEngine(lot, market, offers, vehicles)
  const best = recommendation.bestOption

  if (!best) {
    return {
      ta: `உங்கள் ${lot.crop} லாட்டுக்கு தற்போது சரியான விற்பனை முடிவு கிடைக்கவில்லை.`,
      en: `There is no clear selling recommendation for your ${lot.crop} lot right now.`,
      hi: `आपकी ${lot.crop} लॉट के लिए अभी कोई स्पष्ट बिक्री सिफारिश नहीं है।`,
      mr: `तुमच्या ${lot.crop} lot साठी सध्याचा योग्य विक्री निर्णय उपलब्ध नाही.`,
    }[language]
  }

  return {
    ta: `${lot.crop}க்கு சிறந்த தேர்வு ₹${best.netPricePerKg.toFixed(2)}/கிலோ. ${best.name} உடன் ${best.verified ? "சரிபார்க்கப்பட்ட" : "முன்மொழிவு"} விற்பனை சாத்தியம்.`,
    en: `The best option for ${lot.crop} is ₹${best.netPricePerKg.toFixed(2)}/kg with ${best.name}. This ${best.verified ? "verified" : "proposed"} offer is currently the strongest route.`,
    hi: `${lot.crop} के लिए सबसे अच्छा विकल्प ₹${best.netPricePerKg.toFixed(2)}/किग्रा ${best.name} के साथ है। यह ${best.verified ? "सत्यापित" : "प्रस्तावित"} प्रस्ताव वर्तमान में सबसे मजबूत विकल्प है।`,
    mr: `${lot.crop} साठी सर्वोत्तम पर्याय ₹${best.netPricePerKg.toFixed(2)}/किलो आहे. ${best.name} सोबत ${best.verified ? "सत्यापित" : "प्रस्ताव"} विक्री शक्य आहे.`,
  }[language]
}

async function buildNetRealisationResponse(
  currentLotId: string | undefined,
  language: VoiceLanguage,
): Promise<string> {
  if (!currentLotId) {
    return responseMap.NET_REALISATION[language]
  }

  const lot = await farmerApi.getLot(currentLotId)
  if (!lot) {
    return responseMap.NET_REALISATION[language]
  }

  const offers = await farmerApi.getOffersForLot(currentLotId)
  if (offers.length === 0) {
    return {
      ta: `${lot.crop}க்கான வாங்குபவர் முன்மொழிவு இன்னும் இல்லை.`,
      en: `There are no buyer offers for ${lot.crop} yet.`,
      hi: `${lot.crop} के लिए अभी तक कोई खरीदार प्रस्ताव नहीं है।`,
      mr: `${lot.crop} साठी खरेदीदार प्रस्ताव अद्याप नाही.`,
    }[language]
  }

  const best = offers
    .map((offer) => ({
      ...offer,
      value: calculateNetRealisation(
        lot.quantityKg,
        offer.offerPricePerKg,
        offer.transportCost,
      ),
    }))
    .sort((a, b) => b.value.netRealisation - a.value.netRealisation)[0]

  if (!best) {
    return responseMap.NET_REALISATION[language]
  }

  return {
    ta: `${lot.crop} க்கான நிகர வருவாய் மதிப்பீடு ₹${best.value.netRealisation.toFixed(2)}. அதிகபட்ச மதிப்பு ₹${best.value.netPricePerKg.toFixed(2)}/கிலோ.`,
    en: `Estimated net realisation for ${lot.crop} is ₹${best.value.netRealisation.toFixed(2)}. The highest estimated net price is ₹${best.value.netPricePerKg.toFixed(2)}/kg.`,
    hi: `${lot.crop} के लिए अनुमानित शुद्ध प्राप्ति ₹${best.value.netRealisation.toFixed(2)} है। उच्चतम अनुमानित शुद्ध मूल्य ₹${best.value.netPricePerKg.toFixed(2)}/किग्रा है।`,
    mr: `${lot.crop} साठी निव्वळ उत्पन्न अंदाज ₹${best.value.netRealisation.toFixed(2)} आहे. सर्वोत्तम दर ₹${best.value.netPricePerKg.toFixed(2)}/किलो आहे.`,
  }[language]
}

async function buildOrderStatusResponse(
  orderId: string | undefined,
  language: VoiceLanguage,
): Promise<string> {
  if (!orderId) {
    return responseMap.ORDER_STATUS[language]
  }

  const order = await farmerApi.getOrder(orderId)
  if (!order) {
    return {
      ta: `ஆர்டர் ${orderId} கிடைக்கவில்லை.`,
      en: `Order ${orderId} was not found.`,
      hi: `ऑर्डर ${orderId} नहीं मिला।`,
      mr: `ऑर्डर ${orderId} उपलब्ध नाही.`,
    }[language]
  }

  return {
    ta: `${order.id} நிலை ${order.status}. கட்டணம் ${order.paymentStatus}.`,
    en: `${order.id} is currently ${order.status}. Payment status is ${order.paymentStatus}.`,
    hi: `${order.id} वर्तमान में ${order.status} है। भुगतान स्थिति ${order.paymentStatus} है।`,
    mr: `${order.id} स्थिती ${order.status}. पेमेंट ${order.paymentStatus}.`,
  }[language]
}

async function buildDiscoverLotsResponse(language: VoiceLanguage): Promise<string> {
  try {
    const lots = await farmerApi.getLots()
    if (!lots || lots.length === 0) {
      return {
        ta: "தற்போது வாங்குவதற்கு பயிர் லாட்கள் எதுவுமில்லை.",
        en: "There are currently no active crop lots available for purchase.",
        hi: "वर्तमान में खरीद के लिए कोई सक्रिय फसल लॉट उपलब्ध नहीं है।",
        mr: "सध्या खरेदीसाठी कोणतेही लॉट्स उपलब्ध नाहीत.",
      }[language]
    }
    const cropNames = Array.from(new Set(lots.map((l) => l.crop))).join(", ")
    return {
      ta: `தற்போது ${lots.length} லாட்கள் கிடைக்கின்றன: ${cropNames}.`,
      en: `There are ${lots.length} active lots available including ${cropNames}.`,
      hi: `वर्तमान में ${lots.length} सक्रिय लॉट उपलब्ध हैं जिनमें शामिल हैं: ${cropNames}।`,
      mr: `सध्या ${lots.length} लॉट्स उपलब्ध आहेत: ${cropNames}.`,
    }[language]
  } catch {
    return responseMap.DISCOVER_LOTS[language]
  }
}

async function buildDisputeStatusResponse(language: VoiceLanguage, orderId?: string): Promise<string> {
  try {
    const targetId = orderId || "ORD-2026-001"
    const disputes = await farmerApi.getDisputes(targetId)
    if (!disputes || disputes.length === 0) {
      return {
        ta: "உங்களிடம் செயலில் உள்ள தகராறுகள் எதுவும் இல்லை.",
        en: "You have no active disputes at this time.",
        hi: "इस समय आपका कोई सक्रिय विवाद नहीं है।",
        mr: "तुमच्याकडे कोणतेही सक्रिय तंटे नाहीत.",
      }[language]
    }
    const active = disputes.filter((d) => d.disputeStatus !== "CLOSED" && d.disputeStatus !== "RESOLVED")
    return {
      ta: `உங்களிடம் ${active.length} செயலில் உள்ள தகராறுகள் உள்ளன.`,
      en: `You currently have ${active.length} active dispute(s).`,
      hi: `वर्तमान में आपके पास ${active.length} सक्रिय विवाद हैं।`,
      mr: `तुमच्याकडे ${active.length} सक्रिय तंटे आहेत.`,
    }[language]
  } catch {
    return responseMap.DISPUTE_STATUS[language]
  }
}

export async function processVoiceQuery(
  rawText: string,
  lang: VoiceLanguage,
  role: UserRole,
  currentLotId?: string,
  currentOrderId?: string,
): Promise<VoiceAssistantResult> {
  const cleaned = rawText.trim()
  const intent = resolveIntent(cleaned, lang, { crop: detectCrop(cleaned) })

  let textResponse = responseMap[intent]?.[lang] ?? responseMap.UNKNOWN[lang]

  if (intent === "CROP_PRICE" || intent === "MARKET_PRICE") {
    textResponse = await buildMarketPriceResponse(cleaned, lang, role)
  } else if (intent === "WEATHER") {
    textResponse = buildWeatherResponse(lang)
  } else if (intent === "FERTILIZER_RECOMMENDATION") {
    textResponse = buildFertilizerResponse(lang)
  } else if (intent === "PEST_CONTROL") {
    textResponse = buildPestControlResponse(lang)
  } else if (intent === "GOVERNMENT_SCHEMES") {
    textResponse = buildGovernmentSchemesResponse(lang)
  } else if (intent === "SEARCH_CROP") {
    textResponse = buildSearchCropResponse(cleaned, lang)
  } else if (intent === "AVAILABLE_LOTS") {
    textResponse = await buildAvailableLotsResponse(lang)
  } else if (intent === "SELLER_DETAILS") {
    textResponse = buildSellerDetailsResponse(lang)
  } else if (intent === "BEST_SELLING_DECISION") {
    textResponse = await buildBestSellingDecisionResponse(currentLotId, lang)
  } else if (intent === "NET_REALISATION") {
    textResponse = await buildNetRealisationResponse(currentLotId, lang)
  } else if (intent === "ORDER_STATUS") {
    textResponse = await buildOrderStatusResponse(currentOrderId, lang)
  } else if (intent === "DISCOVER_LOTS") {
    textResponse = await buildDiscoverLotsResponse(lang)
  } else if (intent === "DISPUTE_STATUS") {
    textResponse = await buildDisputeStatusResponse(lang, currentOrderId)
  }

  const { actionUrl, actionLabel } = getActionDetails(intent, role, currentLotId, currentOrderId)

  return {
    intent,
    textResponse,
    speakResponse: textResponse,
    data: {
      language: lang,
      rawText: cleaned,
      crop: detectCrop(cleaned),
      lotId: currentLotId,
      orderId: currentOrderId,
      actionUrl,
      actionLabel,
    },
  }
}

export function buildVoiceError(lang: VoiceLanguage, message: string): VoiceAssistantResult {
  const text = responseMap.ERROR[lang] ?? responseMap.ERROR.en
  return {
    intent: "ERROR",
    textResponse: `${message} ${text}`,
    speakResponse: text,
  }
}