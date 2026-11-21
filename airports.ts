export type AirportRegion = 'arab' | 'europe' | 'asia' | 'global';
export type DestinationType = 'city' | 'island' | 'space';
export type VehicleType = 'jet' | 'propeller' | 'balloon' | 'concorde';

export interface VehicleConfig {
  id: VehicleType;
  nameAr: string;
  subtitleAr: string;
  speedMultiplier: number; // affects estimated duration slightly for realism
  unlockMinutesRequired: number;
}

export const VEHICLES: VehicleConfig[] = [
  {
    id: 'jet',
    nameAr: 'طائرة نفاثة',
    subtitleAr: 'رحلات سريعة ومتوازنة',
    speedMultiplier: 1,
    unlockMinutesRequired: 0,
  },
  {
    id: 'propeller',
    nameAr: 'طائرة مروحية',
    subtitleAr: 'مثالية للمسافات القصيرة والجزر',
    speedMultiplier: 1.25,
    unlockMinutesRequired: 0,
  },
  {
    id: 'balloon',
    nameAr: 'منطاد هوائي',
    subtitleAr: 'تحليق هادئ للتركيز والتأمل',
    speedMultiplier: 1.5,
    unlockMinutesRequired: 0,
  },
  {
    id: 'concorde',
    nameAr: 'طائرة كونكورد',
    subtitleAr: 'مكافأة 60 دقيقة تركيز',
    speedMultiplier: 0.7,
    unlockMinutesRequired: 60,
  },
];

export interface Airport {
  code: string;
  cityAr: string;
  countryAr: string;
  region: AirportRegion;
  type: DestinationType;
  coords: [number, number]; // [longitude, latitude]
  landmark: string;
  arrivalQuote: string;
  isHub?: boolean;
  unlockMinutesRequired?: number;
}

export const AIRPORTS: Airport[] = [
  // Major Cities
  {
    code: 'ALG',
    cityAr: 'الجزائر',
    countryAr: 'الجزائر',
    region: 'arab',
    type: 'city',
    coords: [3.2154, 36.691],
    landmark: 'القصبة ومقام الشهيد',
    arrivalQuote: 'أهلاً بك في الجزائر البيضاء! عزيمتك في الدراسة تضيء طريق نجاحك.',
    isHub: true,
  },
  {
    code: 'RUH',
    cityAr: 'الرياض',
    countryAr: 'السعودية',
    region: 'arab',
    type: 'city',
    coords: [46.6988, 24.9576],
    landmark: 'مركز الملك عبدالله المالي',
    arrivalQuote: 'أهلاً بك في قلب نجد! انضباطك اليوم يشبه شموخ أبراج الرياض.',
    isHub: true,
  },
  {
    code: 'DXB',
    cityAr: 'دبي',
    countryAr: 'الإمارات',
    region: 'arab',
    type: 'city',
    coords: [55.3644, 25.2528],
    landmark: 'متحف المستقبل وبرج خليفة',
    arrivalQuote: 'وصلت إلى مدينة المستقبل! كل دقيقة تركيز تبني خطوة جديدة نحو طموحك.',
    isHub: true,
  },
  {
    code: 'DOH',
    cityAr: 'الدوحة',
    countryAr: 'قطر',
    region: 'arab',
    type: 'city',
    coords: [51.6081, 25.2731],
    landmark: 'متحف الفن الإسلامي والكورنيش',
    arrivalQuote: 'رحلة موفقة إلى لؤلؤة الخليج! الإصرار الهادئ يصنع أعظم الإنجازات.',
    isHub: true,
  },
  {
    code: 'JED',
    cityAr: 'جدة',
    countryAr: 'السعودية',
    region: 'arab',
    type: 'city',
    coords: [39.1565, 21.6796],
    landmark: 'واجهة جدة البحرية والبلد',
    arrivalQuote: 'هبطت في عروس البحر الأحمر! موجات تركيزك وصلت إلى برّ الإتقان.',
    isHub: true,
  },
  {
    code: 'CAI',
    cityAr: 'القاهرة',
    countryAr: 'مصر',
    region: 'arab',
    type: 'city',
    coords: [31.4056, 30.1219],
    landmark: 'الأهرامات وضفاف النيل',
    arrivalQuote: 'وصلت إلى أرض الحضارة! المعرفة التي زرعتها اليوم ستبقى راسخة.',
    isHub: true,
  },
  {
    code: 'AMM',
    cityAr: 'عمّان',
    countryAr: 'الأردن',
    region: 'arab',
    type: 'city',
    coords: [35.9932, 31.7226],
    landmark: 'جبل القلعة والمدرج الروماني',
    arrivalQuote: 'مرحباً بك في مدينة التلال السبع! ثباتك أثناء الدراسة يستحق التقدير.',
    isHub: true,
  },
  {
    code: 'KWI',
    cityAr: 'الكويت',
    countryAr: 'الكويت',
    region: 'arab',
    type: 'city',
    coords: [47.9689, 29.2266],
    landmark: 'أبراج الكويت',
    arrivalQuote: 'وصلت بسلام! كل جلسة دراسة متقنة هي استثمار مضمون في مستقبلك.',
    isHub: true,
  },
  {
    code: 'CMN',
    cityAr: 'الدار البيضاء',
    countryAr: 'المغرب',
    region: 'arab',
    type: 'city',
    coords: [-7.5898, 33.3675],
    landmark: 'مسجد الحسن الثاني والمحيط الأطلسي',
    arrivalQuote: 'إطلالة أطلسية رائعة بعد رحلة تركيز مثمرة! استمر بهذا الزخم.',
    isHub: true,
  },
  {
    code: 'MCT',
    cityAr: 'مسقط',
    countryAr: 'عُمان',
    region: 'arab',
    type: 'city',
    coords: [58.2844, 23.5933],
    landmark: 'دار الأوبرا السلطانية ومطرح',
    arrivalQuote: 'هدوء مسقط وجمالها يكافئان صفاء ذهنك طوال هذه الرحلة.',
  },
  {
    code: 'TUN',
    cityAr: 'تونس',
    countryAr: 'تونس',
    region: 'arab',
    type: 'city',
    coords: [10.2272, 36.851],
    landmark: 'قرطاج وسيدي بوسعيد',
    arrivalQuote: 'وصلت إلى المتوسط! المثابرة الصغيرة المتواصلة تتجاوز العقبات الكبيرة.',
  },
  {
    code: 'IST',
    cityAr: 'إسطنبول',
    countryAr: 'تركيا',
    region: 'europe',
    type: 'city',
    coords: [28.7519, 41.2753],
    landmark: 'مضيق البوسفور وآيا صوفيا',
    arrivalQuote: 'عبرت جسر القارتين بعقلك وإرادتك! هنيئاً لك هذا الإنجاز الدراسي.',
  },
  {
    code: 'FCO',
    cityAr: 'روما',
    countryAr: 'إيطاليا',
    region: 'europe',
    type: 'city',
    coords: [12.2389, 41.8003],
    landmark: 'الكولوسيوم',
    arrivalQuote: 'كل الطرق تؤدي إلى النجاح عندما تلتزم بخطتك الدراسية!',
  },
  {
    code: 'MAD',
    cityAr: 'مدريد',
    countryAr: 'إسبانيا',
    region: 'europe',
    type: 'city',
    coords: [-3.5676, 40.4983],
    landmark: 'القصر الملكي ومتحف البرادو',
    arrivalQuote: 'وصلت إلى قلب إسبانيا! شغفك بالتعلم يصنع الفارق الحقيقي.',
  },
  {
    code: 'CDG',
    cityAr: 'باريس',
    countryAr: 'فرنسا',
    region: 'europe',
    type: 'city',
    coords: [2.5479, 49.0097],
    landmark: 'برج إيفل ومتحف اللوفر',
    arrivalQuote: 'مرحباً بك في مدينة النور! إبداعك يتغذى على ساعات تركيزك العميق.',
  },
  {
    code: 'ZRH',
    cityAr: 'زيورخ',
    countryAr: 'سويسرا',
    region: 'europe',
    type: 'city',
    coords: [8.5555, 47.4582],
    landmark: 'جبال الألب وبحيرة زيورخ',
    arrivalQuote: 'دقة سويسرية في إدارة وقتك! رحلتك الدراسية اكتملت بنجاح تام.',
  },
  {
    code: 'LHR',
    cityAr: 'لندن',
    countryAr: 'المملكة المتحدة',
    region: 'europe',
    type: 'city',
    coords: [-0.4543, 51.47],
    landmark: 'ساعة بيغ بن ونهر التايمز',
    arrivalQuote: 'هبوط مثالي في لندن! الانضباط هو المفتاح الصامت لكل إنجاز عظيم.',
  },
  {
    code: 'SIN',
    cityAr: 'سنغافورة',
    countryAr: 'سنغافورة',
    region: 'asia',
    type: 'city',
    coords: [103.9915, 1.3644],
    landmark: 'مارينا باي والحدائق المعلقة',
    arrivalQuote: 'وصلت إلى واحة التميز العلمي! تركيزك المتواصل يقربك من أهدافك الكبرى.',
  },
  {
    code: 'ICN',
    cityAr: 'سيول',
    countryAr: 'كوريا الجنوبية',
    region: 'asia',
    type: 'city',
    coords: [126.4407, 37.4602],
    landmark: 'برج سيول ونهر الهان',
    arrivalQuote: 'رحلة طويلة أثبتت فيها نفساً طويلاً وقدرة مذهلة على التركيز!',
  },
  {
    code: 'HND',
    cityAr: 'طوكيو',
    countryAr: 'اليابان',
    region: 'asia',
    type: 'city',
    coords: [139.7798, 35.5494],
    landmark: 'جبل فوجي وبرج طوكيو',
    arrivalQuote: 'وصلت إلى بلاد الإتقان (كايزن)! تحسّن 1% كل يوم يصنع المعجزات.',
  },
  {
    code: 'JFK',
    cityAr: 'نيويورك',
    countryAr: 'الولايات المتحدة',
    region: 'global',
    type: 'city',
    coords: [-73.7781, 40.6413],
    landmark: 'أفق مانهاتن',
    arrivalQuote: 'رحلة عابرة للقارات من التركيز العميق! أنت قادر على تحقيق أصعب الأهداف.',
  },

  // Tropical Islands
  {
    code: 'JTR',
    cityAr: 'سانتوريني',
    countryAr: 'اليونان',
    region: 'europe',
    type: 'island',
    coords: [25.4793, 36.3992],
    landmark: 'القباب البيضاء وبحر إيجة',
    arrivalQuote: 'هبطت في جزيرة سانتوريني! صفاء ذهنك يضاهي صفاء مياه بحر إيجة.',
  },
  {
    code: 'MLE',
    cityAr: 'المالديف',
    countryAr: 'جزر المالديف',
    region: 'asia',
    type: 'island',
    coords: [73.5291, 4.1918],
    landmark: 'الجزر المرجانية والمحيط الهندي',
    arrivalQuote: 'استراحة استوائية مستحقة في المالديف بعد رحلة مذاكرة مركّزة!',
  },
  {
    code: 'SEZ',
    cityAr: 'سيشل',
    countryAr: 'جمهورية سيشل',
    region: 'global',
    type: 'island',
    coords: [55.5218, -4.6743],
    landmark: 'شواطئ ماهي والغابات الاستوائية',
    arrivalQuote: 'وصلت إلى أرخبيل سيشل! كل ساعة تقضيها في التعلم تفتح لك آفاقاً جديدة.',
  },
  {
    code: 'ZNZ',
    cityAr: 'زنجبار',
    countryAr: 'تنزانيا',
    region: 'global',
    type: 'island',
    coords: [39.2249, -6.222],
    landmark: 'المدينة الحجرية وساحل المحيط الهندي',
    arrivalQuote: 'أهلاً بك في جزيرة التوابل! استمتع بلحظة الفخر بإنجاز جلستك.',
  },
  {
    code: 'DPS',
    cityAr: 'بالي',
    countryAr: 'إندونيسيا',
    region: 'asia',
    type: 'island',
    coords: [115.1672, -8.7482],
    landmark: 'مدرجات أوبود الخضراء',
    arrivalQuote: 'توازن رائع بين العمل الجاد والهدوء النفسي في جزيرة بالي.',
  },
  {
    code: 'BOB',
    cityAr: 'بورا بورا',
    countryAr: 'بولينيزيا الفرنسية',
    region: 'global',
    type: 'island',
    coords: [-151.7513, -16.4444],
    landmark: 'البحيرة الفيروزية وجبل أوتيمانو',
    arrivalQuote: 'إنجاز استثنائي! فتحت جوهرة المحيط الهادئ بفضل مثابرتك المستمرة.',
    unlockMinutesRequired: 120,
  },

  // Space Stations
  {
    code: 'ISS',
    cityAr: 'محطة الفضاء الدولية',
    countryAr: 'المدار الأرضي المنخفض',
    region: 'global',
    type: 'space',
    coords: [15.0, 48.0],
    landmark: 'ارتفاع 408 كم فوق الأرض',
    arrivalQuote: 'التحام ناجح بمحطة الفضاء الدولية! تركيزك اليوم تجاوز حدود الجاذبية.',
  },
  {
    code: 'GEO',
    cityAr: 'محطة المدار الجغرافي',
    countryAr: 'المدار الفضائي العالي',
    region: 'global',
    type: 'space',
    coords: [-52.0, 8.0],
    landmark: 'نقطة الرصد المدارية العليا',
    arrivalQuote: 'وصلت إلى المدار العالي! طموحك العلمي لا يعرف سقفاً ولا حدوداً.',
  },
  {
    code: 'LUN',
    cityAr: 'قاعدة القمر',
    countryAr: 'بحر السكون القمري',
    region: 'global',
    type: 'space',
    coords: [95.0, 52.0],
    landmark: 'المحطة القمرية الدائمة',
    arrivalQuote: 'هبطت على سطح القمر! لقد وصلت إلى مستوى نادر من الالتزام والانضباط.',
    unlockMinutesRequired: 180,
  },
];

export const HUB_AIRPORTS = AIRPORTS.filter((a) => a.isHub);

export function getAirportByCode(code: string): Airport {
  return AIRPORTS.find((a) => a.code === code) || AIRPORTS[0];
}

export function getVehicleById(id: VehicleType): VehicleConfig {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

export function isAirportUnlocked(airport: Airport, totalCompletedMinutes: number): boolean {
  if (!airport.unlockMinutesRequired) return true;
  return totalCompletedMinutes >= airport.unlockMinutesRequired;
}

export function isVehicleUnlocked(vehicle: VehicleConfig, totalCompletedMinutes: number): boolean {
  return totalCompletedMinutes >= vehicle.unlockMinutesRequired;
}

export function calculateDistanceKm(from: Airport, to: Airport): number {
  if (to.type === 'space') {
    const baseSurface = haversineKm(from.coords, to.coords);
    if (to.code === 'ISS') return Math.max(1800, Math.round(baseSurface * 0.8 + 410));
    if (to.code === 'GEO') return Math.max(4200, Math.round(baseSurface + 2400));
    return Math.max(8500, Math.round(baseSurface * 1.4 + 5200));
  }
  return haversineKm(from.coords, to.coords);
}

function haversineKm(c1: [number, number], c2: [number, number]): number {
  const [lon1, lat1] = c1;
  const [lon2, lat2] = c2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function estimateFlightMinutes(
  distanceKm: number,
  vehicleType: VehicleType = 'jet'
): number {
  if (distanceKm <= 0) return 25;
  const vehicle = getVehicleById(vehicleType);
  const raw = Math.round(((distanceKm / 1800) * 60 + 15) * vehicle.speedMultiplier);
  const rounded = Math.round(raw / 5) * 5;
  return Math.max(15, Math.min(360, rounded));
}

export interface DestinationMatch {
  airport: Airport;
  distanceKm: number;
  estimatedMinutes: number;
  deltaMinutes: number;
}

export function getDestinationsForDuration(
  originCode: string,
  targetMinutes: number,
  destinationType?: DestinationType,
  vehicleType: VehicleType = 'jet',
  totalCompletedMinutes = 0
): DestinationMatch[] {
  const origin = getAirportByCode(originCode);
  return AIRPORTS.filter((a) => {
    if (a.code === origin.code) return false;
    if (!isAirportUnlocked(a, totalCompletedMinutes)) return false;
    if (destinationType && a.type !== destinationType) return false;
    return true;
  })
    .map((airport) => {
      const distanceKm = calculateDistanceKm(origin, airport);
      const estimatedMinutes = estimateFlightMinutes(distanceKm, vehicleType);
      return {
        airport,
        distanceKm,
        estimatedMinutes,
        deltaMinutes: Math.abs(estimatedMinutes - targetMinutes),
      };
    })
    .sort((a, b) => a.deltaMinutes - b.deltaMinutes || a.distanceKm - b.distanceKm);
}

export function generateFlightNumber(originCode: string, destCode: string): string {
  const sum =
    originCode.charCodeAt(0) +
    originCode.charCodeAt(1) +
    destCode.charCodeAt(0) +
    destCode.charCodeAt(2);
  const num = 100 + ((sum * 17) % 890);
  return `RF${num}`;
}

export function formatMinutesArabic(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return hours === 1 ? 'ساعة واحدة' : `${hours} ساعات`;
  return `${hours} س ${mins} د`;
}

export function getDurationMotivation(minutes: number): string {
  if (minutes < 30) {
    return 'انطلاقة سريعة وذكية! الجلسات القصيرة المنتظمة تصنع فرقاً تراكمياً مذهلاً.';
  }
  if (minutes < 60) {
    return 'تركيز متزن وإيقاع ممتاز! حافظت على انتباهك من الإقلاع حتى الهبوط.';
  }
  if (minutes < 120) {
    return 'جلسة تركيز عميق من الطراز الرفيع! ساعة أو أكثر من الانغماس المعرفي الحقيقي.';
  }
  return 'ماراثون دراسي استثنائي! قدرتك على الصمود والتركيز الطويل تستحق أعلى وسام طيران.';
}

export interface FlightTelemetry {
  altitudeFeet: number;
  altitudeMeters: number;
  speedKmh: number;
  outsideTempC: number;
}

export function computeFlightTelemetry(
  progress: number,
  vehicleType: VehicleType,
  destinationType: DestinationType,
  isFlying: boolean
): FlightTelemetry {
  const clamped = Math.max(0, Math.min(1, progress));
  if (!isFlying && clamped === 0) {
    return {
      altitudeFeet: 0,
      altitudeMeters: 0,
      speedKmh: 0,
      outsideTempC: 22,
    };
  }

  // Smooth climb (0..0.12), cruise (0.12..0.88), descent (0.88..1.0)
  let climbFactor = 1;
  if (clamped < 0.12) {
    climbFactor = Math.sin((clamped / 0.12) * (Math.PI / 2));
  } else if (clamped > 0.88) {
    climbFactor = Math.sin(((1 - clamped) / 0.12) * (Math.PI / 2));
  }

  const maxAltFeet =
    destinationType === 'space'
      ? 1338000
      : vehicleType === 'balloon'
      ? 4500
      : vehicleType === 'propeller'
      ? 18500
      : vehicleType === 'concorde'
      ? 58000
      : 36000;

  const cruiseSpeed =
    destinationType === 'space'
      ? 27600
      : vehicleType === 'balloon'
      ? 95
      : vehicleType === 'propeller'
      ? 520
      : vehicleType === 'concorde'
      ? 2150
      : 875;

  const altitudeFeet = Math.round(maxAltFeet * climbFactor);
  const altitudeMeters = Math.round(altitudeFeet * 0.3048);
  const speedKmh = Math.round(cruiseSpeed * (0.28 + 0.72 * climbFactor));
  const outsideTempC =
    destinationType === 'space'
      ? Math.round(22 - 172 * climbFactor)
      : Math.round(22 - (altitudeFeet / 36000) * 76);

  return {
    altitudeFeet,
    altitudeMeters,
    speedKmh,
    outsideTempC,
  };
}

