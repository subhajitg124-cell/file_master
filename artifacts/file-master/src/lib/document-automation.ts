import {
  BadgeIndianRupee,
  BookOpenCheck,
  BriefcaseBusiness,
  Camera,
  FileArchive,
  FileCheck2,
  FileImage,
  FileText,
  GraduationCap,
  IdCard,
  Landmark,
  ScanLine,
  ShieldCheck,
  Signature,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export type AppLanguage = "en" | "bn" | "hi";

export interface DocumentRule {
  id: string;
  label: string;
  acceptedFormats: string[];
  maxSizeKb: number;
  minSizeKb?: number;
  width?: number;
  height?: number;
  dpi?: number;
  required: boolean;
  outputName: string;
  target: string;
}

export interface EventRule {
  id: string;
  title: string;
  category: "scheme" | "student" | "identity" | "job" | "admission";
  description: string;
  icon: typeof Landmark;
  popularity: number;
  estimatedTime: string;
  zipStructure: string[];
  namingPattern: string;
  documents: DocumentRule[];
}

export const translations: Record<AppLanguage, Record<string, string>> = {
  en: {
    assistantTitle: "Smart Government Assistant",
    assistantCopy: "Pick a scheme, upload documents, and FileNova AI prepares a submission-ready ZIP.",
    fixMode: "Fix My Documents",
    upload: "Upload documents",
    admin: "Admin",
  },
  bn: {
    assistantTitle: "স্মার্ট সরকারি সহায়ক",
    assistantCopy: "স্কিম বেছে নিন, ডকুমেন্ট আপলোড করুন, FileNova AI জমা দেওয়ার ZIP বানাবে।",
    fixMode: "আমার ডকুমেন্ট ঠিক করুন",
    upload: "ডকুমেন্ট আপলোড",
    admin: "অ্যাডমিন",
  },
  hi: {
    assistantTitle: "स्मार्ट सरकारी सहायक",
    assistantCopy: "योजना चुनें, दस्तावेज अपलोड करें, FileNova AI सबमिशन ZIP तैयार करेगा।",
    fixMode: "मेरे दस्तावेज ठीक करें",
    upload: "दस्तावेज अपलोड करें",
    admin: "एडमिन",
  },
};

export const eventRules: EventRule[] = [
  {
    id: "scholarship",
    title: "Scholarship ZIP Maker",
    category: "student",
    description: "Income, caste, marksheet, bank passbook, photo and signature packed for scholarship portals.",
    icon: GraduationCap,
    popularity: 98,
    estimatedTime: "3 min",
    namingPattern: "{studentName}_{documentType}_{year}",
    zipStructure: ["01_identity", "02_academic", "03_financial", "04_photo_signature"],
    documents: [
      { id: "photo", label: "Passport photo", acceptedFormats: ["JPG", "PNG"], maxSizeKb: 50, width: 200, height: 230, dpi: 300, required: true, outputName: "passport_photo.jpg", target: "200 x 230 px, under 50KB" },
      { id: "signature", label: "Signature", acceptedFormats: ["JPG", "PNG"], maxSizeKb: 30, width: 140, height: 60, required: true, outputName: "signature.jpg", target: "140 x 60 px, under 30KB" },
      { id: "income", label: "Income certificate", acceptedFormats: ["PDF", "JPG"], maxSizeKb: 200, required: true, outputName: "income_certificate.pdf", target: "PDF under 200KB" },
      { id: "marksheet", label: "Last marksheet", acceptedFormats: ["PDF", "JPG"], maxSizeKb: 300, required: true, outputName: "marksheet.pdf", target: "Readable PDF under 300KB" },
      { id: "bank", label: "Bank passbook", acceptedFormats: ["PDF", "JPG"], maxSizeKb: 200, required: true, outputName: "bank_passbook.pdf", target: "Account page only" },
    ],
  },
  {
    id: "lakshmir-bhandar",
    title: "Lakshmir Bhandar",
    category: "scheme",
    description: "Aadhaar, Swasthya Sathi, bank and photo documents validated for West Bengal scheme submission.",
    icon: BadgeIndianRupee,
    popularity: 94,
    estimatedTime: "4 min",
    namingPattern: "{applicantName}_{scheme}_{documentType}",
    zipStructure: ["identity", "bank", "scheme_forms"],
    documents: [
      { id: "aadhaar", label: "Aadhaar card", acceptedFormats: ["PDF", "JPG", "PNG"], maxSizeKb: 200, required: true, outputName: "aadhaar_card.pdf", target: "Clear front and back, under 200KB" },
      { id: "bank", label: "Bank passbook", acceptedFormats: ["PDF", "JPG"], maxSizeKb: 200, required: true, outputName: "bank_passbook.pdf", target: "Name, IFSC and account visible" },
      { id: "photo", label: "Applicant photo", acceptedFormats: ["JPG", "PNG"], maxSizeKb: 50, width: 200, height: 230, required: true, outputName: "applicant_photo.jpg", target: "Passport photo under 50KB" },
      { id: "swasthya", label: "Swasthya Sathi card", acceptedFormats: ["PDF", "JPG"], maxSizeKb: 200, required: false, outputName: "swasthya_sathi_card.pdf", target: "Optional supporting document" },
    ],
  },
  {
    id: "pan-card",
    title: "PAN Card Upload Fix",
    category: "identity",
    description: "Photo, signature and identity proof resized for PAN application portals.",
    icon: IdCard,
    popularity: 89,
    estimatedTime: "2 min",
    namingPattern: "PAN_{applicantName}_{documentType}",
    zipStructure: ["photo_signature", "identity_proof"],
    documents: [
      { id: "photo", label: "PAN photo", acceptedFormats: ["JPG"], maxSizeKb: 50, width: 213, height: 213, required: true, outputName: "pan_photo.jpg", target: "213 x 213 px JPG" },
      { id: "signature", label: "PAN signature", acceptedFormats: ["JPG"], maxSizeKb: 30, width: 276, height: 118, required: true, outputName: "pan_signature.jpg", target: "276 x 118 px JPG" },
      { id: "identity", label: "Identity proof", acceptedFormats: ["PDF"], maxSizeKb: 300, required: true, outputName: "identity_proof.pdf", target: "PDF under 300KB" },
    ],
  },
  {
    id: "college-admission",
    title: "College Admission ZIP",
    category: "admission",
    description: "Admission form, marksheets, certificates, photo and payment proof organized for college portals.",
    icon: BookOpenCheck,
    popularity: 86,
    estimatedTime: "5 min",
    namingPattern: "{candidateName}_{college}_{documentType}",
    zipStructure: ["application", "academic", "identity", "payment"],
    documents: [
      { id: "form", label: "Filled form", acceptedFormats: ["PDF"], maxSizeKb: 500, required: true, outputName: "filled_application.pdf", target: "Merged PDF under 500KB" },
      { id: "marksheet10", label: "Class 10 marksheet", acceptedFormats: ["PDF", "JPG"], maxSizeKb: 300, required: true, outputName: "class_10_marksheet.pdf", target: "Readable scan" },
      { id: "marksheet12", label: "Class 12 marksheet", acceptedFormats: ["PDF", "JPG"], maxSizeKb: 300, required: true, outputName: "class_12_marksheet.pdf", target: "Readable scan" },
      { id: "photo", label: "Candidate photo", acceptedFormats: ["JPG", "PNG"], maxSizeKb: 50, width: 200, height: 230, required: true, outputName: "candidate_photo.jpg", target: "Passport format" },
      { id: "payment", label: "Payment receipt", acceptedFormats: ["PDF", "JPG"], maxSizeKb: 200, required: false, outputName: "payment_receipt.pdf", target: "Optional receipt" },
    ],
  },
  {
    id: "job-application",
    title: "Job Application Pack",
    category: "job",
    description: "CV, certificates, photo, signature and identity proof prepared for job form uploads.",
    icon: BriefcaseBusiness,
    popularity: 82,
    estimatedTime: "4 min",
    namingPattern: "{candidateName}_{postName}_{documentType}",
    zipStructure: ["resume", "identity", "education", "photo_signature"],
    documents: [
      { id: "resume", label: "Resume or CV", acceptedFormats: ["PDF"], maxSizeKb: 500, required: true, outputName: "resume.pdf", target: "PDF under 500KB" },
      { id: "photo", label: "Photo", acceptedFormats: ["JPG", "PNG"], maxSizeKb: 50, width: 200, height: 230, required: true, outputName: "photo.jpg", target: "Passport format" },
      { id: "signature", label: "Signature", acceptedFormats: ["JPG", "PNG"], maxSizeKb: 30, required: true, outputName: "signature.jpg", target: "Transparent/white background" },
      { id: "certificates", label: "Certificates", acceptedFormats: ["PDF"], maxSizeKb: 800, required: true, outputName: "certificates.pdf", target: "Merged in correct order" },
    ],
  },
];

export const quickActions = [
  { label: "PDF under 200KB", icon: FileArchive, category: "pdf", action: "compress" },
  { label: "Aadhaar resize", icon: IdCard, category: "image", action: "aadhaar" },
  { label: "Signature resize", icon: Signature, category: "image", action: "signature" },
  { label: "Passport photo", icon: Camera, category: "image", action: "photo" },
  { label: "Image compressor", icon: FileImage, category: "image", action: "compress" },
  { label: "Scan cleanup", icon: ScanLine, category: "image", action: "enhance" },
  { label: "OCR text extraction", icon: FileText, category: "pdf", action: "ocr" },
  { label: "Auto ZIP creator", icon: FileCheck2, category: "office", action: "zip" },
];

export const automationPillars = [
  { label: "Rule engine", value: "Dynamic schemes", icon: Sparkles },
  { label: "Security", value: "Validation + scan hooks", icon: ShieldCheck },
  { label: "Users", value: "Students, CSC, cafe", icon: UserRoundCheck },
  { label: "Output", value: "Submission-ready ZIP", icon: FileCheck2 },
];

export function getRuleCompletion(rule: EventRule, uploadedCount: number) {
  const required = rule.documents.filter((doc) => doc.required).length;
  const done = Math.min(uploadedCount, required);
  return Math.round((done / required) * 100);
}
