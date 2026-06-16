import type { Event } from "./types";

export const mockEvents: Event[] = [
  {
    id: "1",
    title: "親子陶藝工作坊",
    shortDescription: "親手製作獨一無二的陶瓷作品，適合親子共同創作。",
    description:
      "在專業導師指導下，親子可一起體驗拉坯、上色等陶藝工序。完成作品可帶回家，留下美好回憶。場地設有無障礙通道，歡迎各年齡層參加。",
    date: "2026-06-15",
    time: "14:00 - 16:00",
    district: "荃灣",
    mtrStation: "荃灣",
    ageRange: "6-8 歲",
    organizer: "手作陶藝坊",
    tags: ["親子", "工作坊", "創意"],
    category: "親子工作坊",
    priceType: "paid",
    price: "HK$280 / 組",
    senFriendly: false,
    image:
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=500&fit=crop",
    officialLink: "https://example.com/pottery",
    featured: true,
    address: "荃灣青山公路 123 號",
  },
  {
    id: "2",
    title: "週末親子農莊體驗",
    shortDescription: "餵飼小動物、採摘時令蔬果，感受田園樂趣。",
    description:
      "帶小朋友走進大自然，認識農作物生長過程，體驗餵羊、餵雞等農莊活動。設有休息區及小食攤，適合半日遊。",
    date: "2026-06-14",
    time: "10:00 - 17:00",
    district: "元朗",
    mtrStation: "元朗",
    ageRange: "3-5 歲",
    organizer: "綠野農莊",
    tags: ["戶外", "自然", "週末"],
    category: "戶外活動",
    priceType: "paid",
    price: "HK$120 / 人",
    senFriendly: true,
    image:
      "https://images.unsplash.com/photo-1500595046743-be5904a38f71?w=800&h=500&fit=crop",
    officialLink: "https://example.com/farm",
    featured: true,
    address: "元朗錦田路 88 號",
  },
  {
    id: "3",
    title: "免費社區親子閱讀日",
    shortDescription: "圖書館舉辦的免費親子共讀活動，附送小禮物。",
    description:
      "由專業講者帶領親子共讀繪本，培養閱讀興趣。活動後有互動遊戲及小禮物派發，名額有限，先到先得。",
    date: "2026-06-15",
    time: "11:00 - 12:30",
    district: "沙田",
    mtrStation: "沙田",
    ageRange: "3-5 歲",
    organizer: "沙田公共圖書館",
    tags: ["免費", "閱讀", "社區"],
    category: "藝術文化",
    priceType: "free",
    senFriendly: true,
    image:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&h=500&fit=crop",
    featured: true,
    address: "沙田沙田正街 18 號",
  },
  {
    id: "4",
    title: "兒童 STEM 機械人編程",
    shortDescription: "動手組裝及編程小型機械人，啟發科技興趣。",
    description:
      "透過趣味任務學習基礎編程概念，完成闖關可獲證書。小班教學，每班最多 12 人，確保學習效果。",
    date: "2026-06-21",
    time: "15:00 - 17:00",
    district: "九龍城",
    mtrStation: "樂富",
    ageRange: "9-12 歲",
    organizer: "CodeKids HK",
    tags: ["STEM", "編程", "科技"],
    category: "STEM 科技",
    priceType: "paid",
    price: "HK$350 / 人",
    senFriendly: false,
    image:
      "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&h=500&fit=crop",
    officialLink: "https://example.com/robot",
    featured: true,
    address: "九龍城獅子石道 15 號",
  },
  {
    id: "5",
    title: "香港科學館免費開放日",
    shortDescription: "科學館常設展覽免費入場，適合全家大小。",
    description:
      "指定日子科學館常設展覽免費開放，包括能量球、電力廊等熱門展區。建議提前網上預約入場時段。",
    date: "2026-06-20",
    endDate: "2026-06-22",
    time: "10:00 - 19:00",
    district: "油尖旺",
    mtrStation: "尖沙咀",
    ageRange: "全齡",
    organizer: "香港科學館",
    tags: ["免費", "博物館", "教育"],
    category: "博物館",
    priceType: "free",
    senFriendly: false,
    image:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=500&fit=crop",
    officialLink: "https://example.com/science-museum",
    featured: true,
    address: "尖沙咀東部科學館道 2 號",
  },
  {
    id: "6",
    title: "SEN 友善感官探索工作坊",
    shortDescription: "專為有特殊需要兒童設計的感官體驗活動。",
    description:
      "由具 SEN 教學經驗的導師帶領，透過觸覺、聽覺及視覺遊戲，在安全環境中探索世界。小班制，家長可陪同。",
    date: "2026-06-15",
    time: "10:00 - 11:30",
    district: "中西區",
    mtrStation: "中環",
    ageRange: "3-5 歲",
    organizer: "彩虹 SEN 中心",
    tags: ["SEN", "感官", "Inclusive"],
    category: "親子工作坊",
    priceType: "paid",
    price: "HK$200 / 人",
    senFriendly: true,
    image:
      "https://images.unsplash.com/photo-1503454537845-d2909b098d93?w=800&h=500&fit=crop",
    officialLink: "https://example.com/sen",
    address: "中環荷李活道 45 號",
  },
  {
    id: "7",
    title: "親子瑜伽晨間班",
    shortDescription: "在戶外草地進行親子瑜伽，舒展身心。",
    description:
      "專業瑜伽導師帶領親子一起練習基礎瑜伽動作，增進親子互動及身體柔韌度。請自備瑜伽墊及水。",
    date: "2026-06-14",
    time: "08:00 - 09:00",
    district: "南區",
    mtrStation: "香港",
    ageRange: "6-8 歲",
    organizer: "Yoga Family HK",
    tags: ["運動", "戶外", "健康"],
    category: "運動健身",
    priceType: "paid",
    price: "HK$150 / 組",
    senFriendly: false,
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop",
    address: "南區赤柱大街海濱",
  },
  {
    id: "8",
    title: "端午節龍舟嘉年華",
    shortDescription: "觀賞龍舟競渡，現場設有親子遊戲攤位。",
    description:
      "一年一度的龍舟盛事，除競渡外更有包糭工作坊、彩繪龍舟等親子活動。建議提早到達佔好位置。",
    date: "2026-06-13",
    time: "09:00 - 16:00",
    district: "大埔",
    mtrStation: "大埔",
    ageRange: "全齡",
    organizer: "大埔體育會",
    tags: ["節日", "傳統", "戶外"],
    category: "節日慶典",
    priceType: "free",
    senFriendly: false,
    image:
      "https://images.unsplash.com/photo-1528164344705-475426870761?w=800&h=500&fit=crop",
    officialLink: "https://example.com/dragon-boat",
    address: "大埔海濱公園",
  },
  {
    id: "9",
    title: "兒童古典音樂欣賞會",
    shortDescription: "專為兒童設計的互動古典音樂表演。",
    description:
      "樂手現場演奏並與小朋友互動，介紹不同樂器音色。演出約 45 分鐘，適合初次接觸古典音樂的孩子。",
    date: "2026-06-22",
    time: "15:30 - 16:30",
    district: "灣仔",
    mtrStation: "銅鑼灣",
    ageRange: "6-8 歲",
    organizer: "香港小交响乐团",
    tags: ["音樂", "文化", "室內"],
    category: "音樂表演",
    priceType: "paid",
    price: "HK$180 / 人",
    senFriendly: true,
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=500&fit=crop",
    officialLink: "https://example.com/orchestra",
    address: "灣仔軒尼詩道 888 號",
  },
  {
    id: "10",
    title: "免費社區親子運動日",
    shortDescription: "社區中心舉辦免費親子運動遊戲日。",
    description:
      "設有接力賽、投球、跳繩等多項親子運動項目，完成任務可換取小禮品。歡迎 3 歲以上兒童及家長參加。",
    date: "2026-06-15",
    time: "09:30 - 12:00",
    district: "觀塘",
    mtrStation: "鑽石山",
    ageRange: "3-5 歲",
    organizer: "觀塘社區中心",
    tags: ["免費", "運動", "社區"],
    category: "運動健身",
    priceType: "free",
    senFriendly: false,
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba7331?w=800&h=500&fit=crop",
    address: "觀塘道 418 號",
  },
  {
    id: "11",
    title: "嬰兒感官啟蒙班",
    shortDescription: "0-2 歲嬰兒專屬的感官刺激活動。",
    description:
      "透過音樂、色彩及觸摸玩具，刺激嬰兒感官發展。由註冊育嬰導師帶領，家長可學習在家延續練習的方法。",
    date: "2026-06-18",
    time: "10:30 - 11:30",
    district: "東區",
    mtrStation: "銅鑼灣",
    ageRange: "0-2 歲",
    organizer: "Baby Sensory HK",
    tags: ["嬰兒", "感官", "早期教育"],
    category: "親子工作坊",
    priceType: "paid",
    price: "HK$220 / 組",
    senFriendly: true,
    image:
      "https://images.unsplash.com/photo-1515488042361-ee00e6ddd8e8?w=800&h=500&fit=crop",
    address: "東區英皇道 200 號",
  },
  {
    id: "12",
    title: "西九文化區親子藝術日",
    shortDescription: "免費戶外藝術裝置及親子手作攤位。",
    description:
      "西九文化區舉辦的親子藝術日，設有大型互動裝置、街頭表演及免費手作攤位。空間寬敞，適合推嬰兒車。",
    date: "2026-06-14",
    time: "11:00 - 18:00",
    district: "油尖旺",
    mtrStation: "奧運",
    ageRange: "全齡",
    organizer: "西九文化區",
    tags: ["免費", "藝術", "戶外"],
    category: "藝術文化",
    priceType: "free",
    senFriendly: true,
    image:
      "https://images.unsplash.com/photo-1460661419701-36794a563453?w=800&h=500&fit=crop",
    officialLink: "https://example.com/westk",
    address: "西九文化區藝術公園",
  },
];

export function getEventById(id: string): Event | undefined {
  return mockEvents.find((event) => event.id === id);
}

export function getFeaturedEvents(): Event[] {
  return mockEvents.filter((event) => event.featured);
}

export function getFreeEvents(): Event[] {
  return mockEvents.filter((event) => event.priceType === "free");
}

export function getSenFriendlyEvents(): Event[] {
  return mockEvents.filter((event) => event.senFriendly);
}
