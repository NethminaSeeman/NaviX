import sigiriyaImage from "@/assets/destinations/sigiriya.jpg";
import ellaImage from "@/assets/destinations/ella.jpg";
import galleImage from "@/assets/destinations/galle.jpg";
import kandyImage from "@/assets/destinations/kandy.jpg";
import nuwaraEliyaImage from "@/assets/destinations/nuwara-eliya.jpg";

export const featuredDestinations = [
  {
    id: "sigiriya",
    name: "Sigiriya Rock Fortress",
    district: "Matale",
    category: "Heritage",
    image: sigiriyaImage,
    duration: "2-3 hours",
    history:
      "An ancient rock fortress built by King Kashyapa in the 5th century with frescoes and landscaped gardens.",
    tips: ["Start early to avoid heat", "Wear shoes with grip"],
    coordinates: { lat: 7.957, lng: 80.7603 },
  },
  {
    id: "ella",
    name: "Ella Scenic Highlands",
    district: "Badulla",
    category: "Nature",
    image: ellaImage,
    duration: "Full day",
    history:
      "Ella is known for tea estates, colonial-era rail heritage, and panoramic viewpoints.",
    tips: ["Carry a light jacket", "Book train seats in advance"],
    coordinates: { lat: 6.8667, lng: 81.0466 },
  },
  {
    id: "galle",
    name: "Galle Fort",
    district: "Southern Province",
    category: "Coastal Heritage",
    image: galleImage,
    duration: "3-4 hours",
    history:
      "A UNESCO World Heritage fort city with Portuguese and Dutch-era architecture.",
    tips: ["Visit by sunset", "Try local seafood nearby"],
    coordinates: { lat: 6.0329, lng: 80.2168 },
  },
  {
    id: "kandy",
    name: "Temple of the Sacred Tooth Relic",
    district: "Kandy",
    category: "Cultural",
    image: kandyImage,
    duration: "2 hours",
    history:
      "One of Sri Lanka's most sacred Buddhist temples and a cornerstone of Kandyan royal history.",
    tips: ["Wear modest clothing", "Visit in the evening for rituals"],
    coordinates: { lat: 7.2936, lng: 80.6413 },
  },
  {
    id: "nuwara-eliya",
    name: "Nuwara Eliya Tea Country",
    district: "Nuwara Eliya",
    category: "Hill Country",
    image: nuwaraEliyaImage,
    duration: "Full day",
    history:
      "A cool-climate highland town shaped by tea plantations and colonial architecture.",
    tips: ["Carry a warm layer", "Start early for tea estate tours"],
    coordinates: { lat: 6.9497, lng: 80.7891 },
  },
];

export const socialLinks = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "YouTube", href: "https://youtube.com" },
];
