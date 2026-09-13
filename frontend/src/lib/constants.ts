export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export const APP_CONFIG = {
  name: "AGRIQUENE",
  portalTitle: "National Agricultural Procurement Queue & ETA System",
  tagline: "Smart Procurement. Less Waiting. Better Planning.",
  subTagline: "Know your turn before you reach the centre.",
  helpline: "1800-180-1551 (Kisan Call Centre Toll-Free)",
  supportEmail: "support@agriquene.gov.in",
  version: "v1.0.0 (SIH 2026)",
};

export const CROPS_MASTER = [
  { name: "Wheat (Sharbati/Kalyansona)", hindi: "गेहूं", msp: 2275, unit: "₹/Quintal", season: "Rabi 2026" },
  { name: "Paddy (Common Grade A)", hindi: "धान", msp: 2183, unit: "₹/Quintal", season: "Kharif 2026" },
  { name: "Mustard / Rapeseed", hindi: "सरसों", msp: 5650, unit: "₹/Quintal", season: "Rabi 2026" },
  { name: "Maize (Makka)", hindi: "मक्का", msp: 2090, unit: "₹/Quintal", season: "Kharif 2026" },
  { name: "Cotton (Medium Staple)", hindi: "कपास", msp: 6620, unit: "₹/Quintal", season: "Kharif 2026" },
  { name: "Soybean (Yellow)", hindi: "सोयाबीन", msp: 4600, unit: "₹/Quintal", season: "Kharif 2026" },
  { name: "Gram / Chana", hindi: "चना", msp: 5440, unit: "₹/Quintal", season: "Rabi 2026" }
];

export const DEMO_PRESETS = {
  farmer: {
    mobile: "9876543210",
    name: "Ramesh Kumar Sharma",
    centre: "Agri Procurement Centre – Ghaziabad Mandi"
  },
  buyer: {
    identifier: "9811223344",
    empId: "BUYER-GZB-01",
    password: "buyer123",
    name: "Rajesh Verma (Officer)",
    centreId: 1
  },
  admin: {
    identifier: "admin@agriquene.gov.in",
    password: "admin123",
    name: "Dr. S. K. Awasthi (Director)"
  }
};
