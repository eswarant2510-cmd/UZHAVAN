import { calculateNetRealisation } from "../lib/netRealisation"
import { runDecisionEngine } from "./decisionEngine"
import { farmerApi } from "./farmerApi"

export type VoiceState = "READY" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR"

export type VoiceLanguage = "ta" | "mr" | "en"

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
  }
}

const INTENT_KEYWORDS: Array<{ intent: string; patterns: RegExp[] }> = [
  {
    intent: "MARKET_PRICE",
    patterns: [
      /market price|mandi|price today|today.*price|current.*price|price.*today|விலை|சந்தை|भाव|बाजारभाव|दर|बाजार/,
    ],
  },
  {
    intent: "BUYER_COMPARISON",
    patterns: [/buyer|buyers|best offer|compare buyer|compare.*offer|offer.*compare|வாங்குபவர்|खरेदीदार|खरीदार|compare|प्रस्ताव/],
  },
  {
    intent: "NET_REALISATION",
    patterns: [/net realisation|net realization|after transport|after deduction|after cost|net.*return|நிகர|निव्वळ|शुद्ध|after transport|वाहतूक.*खर्च|परिवहन.*खर्च/],
  },
  {
    intent: "BEST_SELLING_DECISION",
    patterns: [/sell now|should i sell|best selling|best decision|sell.*lot|should.*sell|விற்கலாமா|विकावे का|बेचना|विक्री/],
  },
  {
    intent: "WHAT_IF",
    patterns: [/what if|if price falls|falls by|price drop|drop.*price|if.*falls|என்ன ஆகும்|कमी झाल्यास|घसरण|कमी.*भाव/],
  },
  {
    intent: "ORDER_STATUS",
    patterns: [/order status|my order|status of order|order.*status|ஆர்டர்|ऑर्डर|स्थिती|order/],
  },
  {
    intent: "TRANSPORT_STATUS",
    patterns: [/transport|vehicle|docket|logistics|pickup|delivery dispatch|போக்குவரத்து|वाहतूक|गाडी|logistics|फेरी/],
  },
  {
    intent: "PAYMENT_STATUS",
    patterns: [/payment|escrow|paid|money|invoice|settlement|பணம்|पेमेंट|पैसे|payment|दिनांक/],
  },
  {
    intent: "DELIVERY_STATUS",
    patterns: [/delivery|delivered|receive|shipment|receiving|விநியோகம்|वितरण|पोहोच|delivery|वितरण/],
  },
]

const CROP_ALIASES: Record<string, string[]> = {
  tomato: ["tomato", "tomatoes", "தக்காளி", "टमॅटो", "टमाटो"],
  onion: ["onion", "onions", "வெங்காயம்", "कांदा", "प्याज"],
  potato: ["potato", "potatoes", "உருளைக்கிழங்கு", "बटाटा", "बटाटा"],
  grapes: ["grapes", "grape", "திராட்சை", "द्राक्षे", "द्राक्ष"],
  sugarcane: ["sugarcane", "sugar cane", "கரும்பு", "ऊस", "गूळ (ऊस)", "sugarcane"] ,
  paddy: ["paddy", "rice", "நெல்", "धान", "तेंदूळ", "rice"],
  cotton: ["cotton", "kapas", "பருத்தி", "कापूस", "cotton"],
  maize: ["maize", "corn", "மக்காச்சோளம்", "मका", "corn"],
  chili: ["chili", "chilli", "mirchi", "மிளகாய்", "मिरची", "मिर्च"],
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

  if (context?.crop) {
    const cropText = normalizeQuery(context.crop)
    if (cropText && /(tomato|தக்காளி|टमाटो|टमॅटो)/.test(cropText)) {
      if (/price|விலை|भाव|दर|market|சந்தை|बाजार/.test(query)) {
        return "MARKET_PRICE"
      }
    }
  }

  for (const entry of INTENT_KEYWORDS) {
    if (entry.patterns.some((pattern) => pattern.test(query))) {
      return entry.intent
    }
  }

  const languageFallback: Record<VoiceLanguage, RegExp[]> = {
    ta: [/விலை|ஆர்டர்|போக்குவரத்து|பணம்|விநியோகம்|சந்தை|சொத்து|விற்பனை/],
    mr: [/भाव|ऑर्डर|वाहतूक|पेमेंट|वितरण|बाजार|विक्री|संदर्भ/],
    en: [/price|order|transport|payment|delivery|status|market|sell|offer/],
  }

  if (languageFallback[language].some((pattern) => pattern.test(query))) {
    return "UNKNOWN"
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
    ta: `${cropLabel} சந்தை வரம்பு ${range}. தற்போதைய தேவையும் ${market.demand.toLowerCase()} ஆக உள்ளது. விற்பனை சாளரம் ${market.sellingWindow}.`,
    mr: `${cropLabel} बाजार दर ${range}. सध्याची मागणी ${market.demand.toLowerCase()} आहे. विक्री窗口 ${market.sellingWindow}.`,
    en: `${cropLabel} market range is ${range}. Demand is ${market.demand.toLowerCase()} and the selling window is ${market.sellingWindow}.`,
  }

  return translations[language]
}

const responseMap: Record<string, Record<VoiceLanguage, string>> = {
  MARKET_PRICE: {
    ta: "சந்தை விலை அறிக்கை",
    mr: "बाजारभाव अहवाल",
    en: "Market price report",
  },
  BUYER_COMPARISON: {
    ta: "வாங்குபவர் ஒப்பீடு",
    mr: "खरेदीदार तुलना",
    en: "Buyer comparison",
  },
  NET_REALISATION: {
    ta: "நிகர வருவாய்",
    mr: "निव्वळ उत्पन्न",
    en: "Net realisation",
  },
  BEST_SELLING_DECISION: {
    ta: "சிறந்த விற்பனை முடிவு",
    mr: "सर्वोत्तम विक्री निर्णय",
    en: "Best selling decision",
  },
  WHAT_IF: {
    ta: "மாற்று காட்சி",
    mr: "व्हॉट-इफ दृश्य",
    en: "What-if scenario",
  },
  ORDER_STATUS: {
    ta: "ஆர்டர் நிலை",
    mr: "ऑर्डर स्थिती",
    en: "Order status",
  },
  TRANSPORT_STATUS: {
    ta: "போக்குவரத்து நிலை",
    mr: "वाहतूक स्थिती",
    en: "Transport status",
  },
  PAYMENT_STATUS: {
    ta: "பணம் நிலை",
    mr: "पेमेंट स्थिती",
    en: "Payment status",
  },
  DELIVERY_STATUS: {
    ta: "விநியோகம் நிலை",
    mr: "वितरण स्थिती",
    en: "Delivery status",
  },
  UNKNOWN: {
    ta: "மன்னிக்கவும், உங்கள் கேள்வியை இந்த அடிப்படை அமைப்பில் புரிந்துகொள்ள முடியவில்லை.",
    mr: "क्षमस्व, या मूलभूत सेटअपमध्ये मी तुमचा प्रश्न समजू शकत नाही.",
    en: "I could not determine the intent in this foundation setup.",
  },
  ERROR: {
    ta: "செயலாக்கத்தில் சிக்கல் ஏற்பட்டது. தயவுசெய்து உரையை உள்ளிடவும்.",
    mr: "प्रक्रियेत त्रुटी आली आहे. कृपया मजकूर टाइप करा.",
    en: "There was an issue processing the request. Please type your question instead.",
  },
}

async function buildMarketPriceResponse(
  cleanedText: string,
  language: VoiceLanguage,
  role: UserRole,
): Promise<string> {
  const crop = detectCrop(cleanedText) || (role === "buyer" ? "Tomato" : "Tomato")
  const market = await farmerApi.getMarket(crop)
  return formatMarketResponse(market, language, crop)
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
      mr: `तुमच्या ${lot.crop} lot साठी सध्याचा योग्य विक्री निर्णय उपलब्ध नाही.`,
      en: `There is no clear selling recommendation for your ${lot.crop} lot right now.`,
    }[language]
  }

  return {
    ta: `${lot.crop}க்கு சிறந்த தேர்வு ₹${best.netPricePerKg.toFixed(2)}/கிலோ. ${best.name} உடன் ${best.verified ? "சரிபார்க்கப்பட்ட" : "முன்மொழிவு"} விற்பனை சாத்தியம்.`,
    mr: `${lot.crop} साठी सर्वोत्तम पर्याय ₹${best.netPricePerKg.toFixed(2)}/किलो आहे. ${best.name} सोबत ${best.verified ? "सत्यापित" : "प्रस्ताव"} विक्री शक्य आहे.`,
    en: `The best option for ${lot.crop} is ₹${best.netPricePerKg.toFixed(2)}/kg with ${best.name}. This ${best.verified ? "verified" : "proposed"} offer is currently the strongest route.`,
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
      mr: `${lot.crop} साठी खरेदीदार प्रस्ताव अद्याप नाही.`,
      en: `There are no buyer offers for ${lot.crop} yet.`,
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
    mr: `${lot.crop} साठी निव्वळ उत्पन्न अंदाज ₹${best.value.netRealisation.toFixed(2)} आहे. सर्वोत्तम दर ₹${best.value.netPricePerKg.toFixed(2)}/किलो आहे.`,
    en: `Estimated net realisation for ${lot.crop} is ₹${best.value.netRealisation.toFixed(2)}. The highest estimated net price is ₹${best.value.netPricePerKg.toFixed(2)}/kg.`,
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
      mr: `ऑर्डर ${orderId} उपलब्ध नाही.`,
      en: `Order ${orderId} was not found.`,
    }[language]
  }

  return {
    ta: `${order.id} நிலை ${order.status}. கட்டணம் ${order.paymentStatus}.`,
    mr: `${order.id} स्थिती ${order.status}. पेमेंट ${order.paymentStatus}.`,
    en: `${order.id} is currently ${order.status}. Payment status is ${order.paymentStatus}.`,
  }[language]
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

  if (intent === "MARKET_PRICE") {
    textResponse = await buildMarketPriceResponse(cleaned, lang, role)
  } else if (intent === "BEST_SELLING_DECISION") {
    textResponse = await buildBestSellingDecisionResponse(currentLotId, lang)
  } else if (intent === "NET_REALISATION") {
    textResponse = await buildNetRealisationResponse(currentLotId, lang)
  } else if (intent === "ORDER_STATUS") {
    textResponse = await buildOrderStatusResponse(currentOrderId, lang)
  }

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