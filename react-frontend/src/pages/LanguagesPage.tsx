import { useState, useEffect, useCallback, useRef } from 'react';
import { Languages, Plus, Trash2, Star, Globe, AlertCircle, RefreshCw, Sparkles, CheckCircle2, XCircle, Search } from 'lucide-react';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PlatformProvider, usePlatform } from '@/components/site-builder/src/contexts/PlatformContext';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { createPurchase } from '@/components/payments/src/services/purchaseService';

// Langues incluses par plan projet (selon OFFER.md : starter=1, pro=2)
const LANGUAGES_PER_PLAN: Record<string, number> = {
  draft:    1,
  included: 1,
  starter:  1,
  pro:      2,
};

// Liste ISO 639-1 complète (~180 langues) avec drapeau représentatif
const ALL_LANGUAGES: { code: string; name: string; nativeName: string; flag: string }[] = [
  { code: 'af', name: 'Afrikaans',          nativeName: 'Afrikaans',          flag: '🇿🇦' },
  { code: 'ak', name: 'Akan',               nativeName: 'Akan',               flag: '🇬🇭' },
  { code: 'sq', name: 'Albanian',           nativeName: 'Shqip',              flag: '🇦🇱' },
  { code: 'am', name: 'Amharic',            nativeName: 'አማርኛ',               flag: '🇪🇹' },
  { code: 'ar', name: 'Arabic',             nativeName: 'العربية',            flag: '🇸🇦' },
  { code: 'an', name: 'Aragonese',          nativeName: 'Aragonés',           flag: '🇪🇸' },
  { code: 'hy', name: 'Armenian',           nativeName: 'Հայերեն',            flag: '🇦🇲' },
  { code: 'as', name: 'Assamese',           nativeName: 'অসমীয়া',             flag: '🇮🇳' },
  { code: 'av', name: 'Avaric',             nativeName: 'Авар',               flag: '🇷🇺' },
  { code: 'ae', name: 'Avestan',            nativeName: 'Avesta',             flag: '🌐' },
  { code: 'ay', name: 'Aymara',             nativeName: 'Aymar',              flag: '🇧🇴' },
  { code: 'az', name: 'Azerbaijani',        nativeName: 'Azərbaycan',         flag: '🇦🇿' },
  { code: 'bm', name: 'Bambara',            nativeName: 'Bamanankan',         flag: '🇲🇱' },
  { code: 'ba', name: 'Bashkir',            nativeName: 'Башҡорт',            flag: '🇷🇺' },
  { code: 'eu', name: 'Basque',             nativeName: 'Euskara',            flag: '🇪🇸' },
  { code: 'be', name: 'Belarusian',         nativeName: 'Беларуская',         flag: '🇧🇾' },
  { code: 'bn', name: 'Bengali',            nativeName: 'বাংলা',               flag: '🇧🇩' },
  { code: 'bi', name: 'Bislama',            nativeName: 'Bislama',            flag: '🇻🇺' },
  { code: 'bs', name: 'Bosnian',            nativeName: 'Bosanski',           flag: '🇧🇦' },
  { code: 'br', name: 'Breton',             nativeName: 'Brezhoneg',          flag: '🇫🇷' },
  { code: 'bg', name: 'Bulgarian',          nativeName: 'Български',          flag: '🇧🇬' },
  { code: 'my', name: 'Burmese',            nativeName: 'မြန်မာဘာသာ',           flag: '🇲🇲' },
  { code: 'ca', name: 'Catalan',            nativeName: 'Català',             flag: '🇪🇸' },
  { code: 'ch', name: 'Chamorro',           nativeName: 'Chamoru',            flag: '🇬🇺' },
  { code: 'ce', name: 'Chechen',            nativeName: 'Нохчийн',            flag: '🇷🇺' },
  { code: 'ny', name: 'Chichewa',           nativeName: 'Chichewa',           flag: '🇲🇼' },
  { code: 'zh', name: 'Chinese',            nativeName: '中文',                flag: '🇨🇳' },
  { code: 'cv', name: 'Chuvash',            nativeName: 'Чӑваш',              flag: '🇷🇺' },
  { code: 'kw', name: 'Cornish',            nativeName: 'Kernewek',           flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'co', name: 'Corsican',           nativeName: 'Corsu',              flag: '🇫🇷' },
  { code: 'cr', name: 'Cree',               nativeName: 'Cree',               flag: '🇨🇦' },
  { code: 'hr', name: 'Croatian',           nativeName: 'Hrvatski',           flag: '🇭🇷' },
  { code: 'cs', name: 'Czech',              nativeName: 'Čeština',            flag: '🇨🇿' },
  { code: 'da', name: 'Danish',             nativeName: 'Dansk',              flag: '🇩🇰' },
  { code: 'dv', name: 'Divehi',             nativeName: 'ދިވެހި',               flag: '🇲🇻' },
  { code: 'nl', name: 'Dutch',              nativeName: 'Nederlands',         flag: '🇳🇱' },
  { code: 'dz', name: 'Dzongkha',           nativeName: 'རྫོང་ཁ',              flag: '🇧🇹' },
  { code: 'en', name: 'English',            nativeName: 'English',            flag: '🇬🇧' },
  { code: 'eo', name: 'Esperanto',          nativeName: 'Esperanto',          flag: '🌐' },
  { code: 'et', name: 'Estonian',           nativeName: 'Eesti',              flag: '🇪🇪' },
  { code: 'ee', name: 'Ewe',                nativeName: 'Eʋegbe',             flag: '🇬🇭' },
  { code: 'fo', name: 'Faroese',            nativeName: 'Føroyskt',           flag: '🇫🇴' },
  { code: 'fj', name: 'Fijian',             nativeName: 'Vakaviti',           flag: '🇫🇯' },
  { code: 'fi', name: 'Finnish',            nativeName: 'Suomi',              flag: '🇫🇮' },
  { code: 'fr', name: 'French',             nativeName: 'Français',           flag: '🇫🇷' },
  { code: 'ff', name: 'Fula',               nativeName: 'Fulfulde',           flag: '🇸🇳' },
  { code: 'gl', name: 'Galician',           nativeName: 'Galego',             flag: '🇪🇸' },
  { code: 'ka', name: 'Georgian',           nativeName: 'ქართული',            flag: '🇬🇪' },
  { code: 'de', name: 'German',             nativeName: 'Deutsch',            flag: '🇩🇪' },
  { code: 'el', name: 'Greek',              nativeName: 'Ελληνικά',           flag: '🇬🇷' },
  { code: 'gn', name: 'Guaraní',            nativeName: 'Avañeẽ',             flag: '🇵🇾' },
  { code: 'gu', name: 'Gujarati',           nativeName: 'ગુજરાતી',             flag: '🇮🇳' },
  { code: 'ht', name: 'Haitian Creole',     nativeName: 'Kreyòl ayisyen',     flag: '🇭🇹' },
  { code: 'ha', name: 'Hausa',              nativeName: 'Hausa',              flag: '🇳🇬' },
  { code: 'he', name: 'Hebrew',             nativeName: 'עברית',              flag: '🇮🇱' },
  { code: 'hz', name: 'Herero',             nativeName: 'Otjiherero',         flag: '🇳🇦' },
  { code: 'hi', name: 'Hindi',              nativeName: 'हिन्दी',               flag: '🇮🇳' },
  { code: 'ho', name: 'Hiri Motu',          nativeName: 'Hiri Motu',          flag: '🇵🇬' },
  { code: 'hu', name: 'Hungarian',          nativeName: 'Magyar',             flag: '🇭🇺' },
  { code: 'ia', name: 'Interlingua',        nativeName: 'Interlingua',        flag: '🌐' },
  { code: 'id', name: 'Indonesian',         nativeName: 'Bahasa Indonesia',   flag: '🇮🇩' },
  { code: 'ie', name: 'Interlingue',        nativeName: 'Interlingue',        flag: '🌐' },
  { code: 'ga', name: 'Irish',              nativeName: 'Gaeilge',            flag: '🇮🇪' },
  { code: 'ig', name: 'Igbo',               nativeName: 'Igbo',               flag: '🇳🇬' },
  { code: 'ik', name: 'Inupiaq',            nativeName: 'Iñupiaq',            flag: '🇺🇸' },
  { code: 'io', name: 'Ido',                nativeName: 'Ido',                flag: '🌐' },
  { code: 'is', name: 'Icelandic',          nativeName: 'Íslenska',           flag: '🇮🇸' },
  { code: 'it', name: 'Italian',            nativeName: 'Italiano',           flag: '🇮🇹' },
  { code: 'iu', name: 'Inuktitut',          nativeName: 'ᐃᓄᒃᑎᑐᑦ',             flag: '🇨🇦' },
  { code: 'ja', name: 'Japanese',           nativeName: '日本語',              flag: '🇯🇵' },
  { code: 'jv', name: 'Javanese',           nativeName: 'Basa Jawa',          flag: '🇮🇩' },
  { code: 'kl', name: 'Kalaallisut',        nativeName: 'Kalaallisut',        flag: '🇬🇱' },
  { code: 'kn', name: 'Kannada',            nativeName: 'ಕನ್ನಡ',               flag: '🇮🇳' },
  { code: 'kr', name: 'Kanuri',             nativeName: 'Kanuri',             flag: '🇳🇬' },
  { code: 'ks', name: 'Kashmiri',           nativeName: 'कश्मीरी',              flag: '🇮🇳' },
  { code: 'kk', name: 'Kazakh',             nativeName: 'Қазақша',            flag: '🇰🇿' },
  { code: 'km', name: 'Khmer',              nativeName: 'ខ្មែរ',                flag: '🇰🇭' },
  { code: 'ki', name: 'Kikuyu',             nativeName: 'Gĩkũyũ',            flag: '🇰🇪' },
  { code: 'rw', name: 'Kinyarwanda',        nativeName: 'Ikinyarwanda',       flag: '🇷🇼' },
  { code: 'ky', name: 'Kyrgyz',             nativeName: 'Кыргызча',           flag: '🇰🇬' },
  { code: 'kv', name: 'Komi',               nativeName: 'Коми',               flag: '🇷🇺' },
  { code: 'kg', name: 'Kongo',              nativeName: 'Kikongo',            flag: '🇨🇩' },
  { code: 'ko', name: 'Korean',             nativeName: '한국어',              flag: '🇰🇷' },
  { code: 'ku', name: 'Kurdish',            nativeName: 'Kurdî',              flag: '🌐' },
  { code: 'kj', name: 'Kwanyama',           nativeName: 'Kuanyama',           flag: '🇦🇴' },
  { code: 'la', name: 'Latin',              nativeName: 'Latine',             flag: '🌐' },
  { code: 'lb', name: 'Luxembourgish',      nativeName: 'Lëtzebuergesch',     flag: '🇱🇺' },
  { code: 'lg', name: 'Ganda',              nativeName: 'Luganda',            flag: '🇺🇬' },
  { code: 'li', name: 'Limburgish',         nativeName: 'Limburgs',           flag: '🇳🇱' },
  { code: 'ln', name: 'Lingala',            nativeName: 'Lingála',            flag: '🇨🇩' },
  { code: 'lo', name: 'Lao',                nativeName: 'ລາວ',                flag: '🇱🇦' },
  { code: 'lt', name: 'Lithuanian',         nativeName: 'Lietuvių',           flag: '🇱🇹' },
  { code: 'lu', name: 'Luba-Katanga',       nativeName: 'Tshiluba',           flag: '🇨🇩' },
  { code: 'lv', name: 'Latvian',            nativeName: 'Latviešu',           flag: '🇱🇻' },
  { code: 'gv', name: 'Manx',               nativeName: 'Gaelg',              flag: '🇮🇲' },
  { code: 'mk', name: 'Macedonian',         nativeName: 'Македонски',         flag: '🇲🇰' },
  { code: 'mg', name: 'Malagasy',           nativeName: 'Malagasy',           flag: '🇲🇬' },
  { code: 'ms', name: 'Malay',              nativeName: 'Bahasa Melayu',      flag: '🇲🇾' },
  { code: 'ml', name: 'Malayalam',          nativeName: 'മലയാളം',             flag: '🇮🇳' },
  { code: 'mt', name: 'Maltese',            nativeName: 'Malti',              flag: '🇲🇹' },
  { code: 'mi', name: 'Māori',              nativeName: 'Te Reo Māori',       flag: '🇳🇿' },
  { code: 'mr', name: 'Marathi',            nativeName: 'मराठी',               flag: '🇮🇳' },
  { code: 'mh', name: 'Marshallese',        nativeName: 'Kajin M̧ajeļ',       flag: '🇲🇭' },
  { code: 'mn', name: 'Mongolian',          nativeName: 'Монгол',             flag: '🇲🇳' },
  { code: 'na', name: 'Nauru',              nativeName: 'Ekakairũ Naoero',    flag: '🇳🇷' },
  { code: 'nv', name: 'Navajo',             nativeName: 'Diné bizaad',        flag: '🇺🇸' },
  { code: 'nd', name: 'North Ndebele',      nativeName: 'isiNdebele',         flag: '🇿🇼' },
  { code: 'ne', name: 'Nepali',             nativeName: 'नेपाली',              flag: '🇳🇵' },
  { code: 'ng', name: 'Ndonga',             nativeName: 'Owambo',             flag: '🇳🇦' },
  { code: 'nb', name: 'Norwegian Bokmål',   nativeName: 'Norsk Bokmål',       flag: '🇳🇴' },
  { code: 'nn', name: 'Norwegian Nynorsk',  nativeName: 'Norsk Nynorsk',      flag: '🇳🇴' },
  { code: 'no', name: 'Norwegian',          nativeName: 'Norsk',              flag: '🇳🇴' },
  { code: 'ii', name: 'Nuosu',              nativeName: 'ꆈꌠ꒿',               flag: '🇨🇳' },
  { code: 'nr', name: 'South Ndebele',      nativeName: 'isiNdebele',         flag: '🇿🇦' },
  { code: 'oc', name: 'Occitan',            nativeName: 'Occitan',            flag: '🇫🇷' },
  { code: 'oj', name: 'Ojibwe',             nativeName: 'ᐊᓂᔑᓈᐯᒧᐎᓐ',          flag: '🇨🇦' },
  { code: 'cu', name: 'Old Church Slavonic',nativeName: 'ѩзыкъ словѣньскъ',  flag: '🌐' },
  { code: 'om', name: 'Oromo',              nativeName: 'Afaan Oromoo',       flag: '🇪🇹' },
  { code: 'or', name: 'Oriya',              nativeName: 'ଓଡ଼ିଆ',               flag: '🇮🇳' },
  { code: 'os', name: 'Ossetian',           nativeName: 'Ирон',               flag: '🇬🇪' },
  { code: 'pa', name: 'Punjabi',            nativeName: 'ਪੰਜਾਬੀ',              flag: '🇮🇳' },
  { code: 'pi', name: 'Pāli',               nativeName: 'पाऴि',               flag: '🌐' },
  { code: 'fa', name: 'Persian',            nativeName: 'فارسی',              flag: '🇮🇷' },
  { code: 'pl', name: 'Polish',             nativeName: 'Polski',             flag: '🇵🇱' },
  { code: 'ps', name: 'Pashto',             nativeName: 'پښتو',               flag: '🇦🇫' },
  { code: 'pt', name: 'Portuguese',         nativeName: 'Português',          flag: '🇧🇷' },
  { code: 'qu', name: 'Quechua',            nativeName: 'Runa Simi',          flag: '🇵🇪' },
  { code: 'rm', name: 'Romansh',            nativeName: 'Rumantsch',          flag: '🇨🇭' },
  { code: 'rn', name: 'Kirundi',            nativeName: 'Ikirundi',           flag: '🇧🇮' },
  { code: 'ro', name: 'Romanian',           nativeName: 'Română',             flag: '🇷🇴' },
  { code: 'ru', name: 'Russian',            nativeName: 'Русский',            flag: '🇷🇺' },
  { code: 'sa', name: 'Sanskrit',           nativeName: 'संस्कृतम्',            flag: '🇮🇳' },
  { code: 'sc', name: 'Sardinian',          nativeName: 'Sardu',              flag: '🇮🇹' },
  { code: 'sd', name: 'Sindhi',             nativeName: 'سنڌي',               flag: '🇵🇰' },
  { code: 'se', name: 'Northern Sami',      nativeName: 'Davvisámegiella',    flag: '🇳🇴' },
  { code: 'sm', name: 'Samoan',             nativeName: 'Gagana Samoa',       flag: '🇼🇸' },
  { code: 'sg', name: 'Sango',              nativeName: 'Yângâ tî sängö',     flag: '🇨🇫' },
  { code: 'sr', name: 'Serbian',            nativeName: 'Српски',             flag: '🇷🇸' },
  { code: 'gd', name: 'Scottish Gaelic',    nativeName: 'Gàidhlig',           flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { code: 'sn', name: 'Shona',              nativeName: 'chiShona',           flag: '🇿🇼' },
  { code: 'si', name: 'Sinhala',            nativeName: 'සිංහල',              flag: '🇱🇰' },
  { code: 'sk', name: 'Slovak',             nativeName: 'Slovenčina',         flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian',          nativeName: 'Slovenščina',        flag: '🇸🇮' },
  { code: 'so', name: 'Somali',             nativeName: 'Soomaali',           flag: '🇸🇴' },
  { code: 'st', name: 'Southern Sotho',     nativeName: 'Sesotho',            flag: '🇱🇸' },
  { code: 'es', name: 'Spanish',            nativeName: 'Español',            flag: '🇪🇸' },
  { code: 'su', name: 'Sundanese',          nativeName: 'Basa Sunda',         flag: '🇮🇩' },
  { code: 'sw', name: 'Swahili',            nativeName: 'Kiswahili',          flag: '🇰🇪' },
  { code: 'ss', name: 'Swati',              nativeName: 'SiSwati',            flag: '🇸🇿' },
  { code: 'sv', name: 'Swedish',            nativeName: 'Svenska',            flag: '🇸🇪' },
  { code: 'ta', name: 'Tamil',              nativeName: 'தமிழ்',               flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',             nativeName: 'తెలుగు',              flag: '🇮🇳' },
  { code: 'tg', name: 'Tajik',              nativeName: 'Тоҷикӣ',             flag: '🇹🇯' },
  { code: 'th', name: 'Thai',               nativeName: 'ไทย',                flag: '🇹🇭' },
  { code: 'ti', name: 'Tigrinya',           nativeName: 'ትግርኛ',               flag: '🇪🇷' },
  { code: 'bo', name: 'Tibetan',            nativeName: 'བོད་ཡིག',             flag: '🌐' },
  { code: 'tk', name: 'Turkmen',            nativeName: 'Türkmen',            flag: '🇹🇲' },
  { code: 'tl', name: 'Tagalog',            nativeName: 'Tagalog',            flag: '🇵🇭' },
  { code: 'tn', name: 'Tswana',             nativeName: 'Setswana',           flag: '🇧🇼' },
  { code: 'to', name: 'Tonga',              nativeName: 'Faka Tonga',         flag: '🇹🇴' },
  { code: 'tr', name: 'Turkish',            nativeName: 'Türkçe',             flag: '🇹🇷' },
  { code: 'ts', name: 'Tsonga',             nativeName: 'Xitsonga',           flag: '🇿🇦' },
  { code: 'tt', name: 'Tatar',              nativeName: 'Татарча',            flag: '🇷🇺' },
  { code: 'tw', name: 'Twi',                nativeName: 'Twi',                flag: '🇬🇭' },
  { code: 'ty', name: 'Tahitian',           nativeName: 'Reo Tahiti',         flag: '🇵🇫' },
  { code: 'ug', name: 'Uyghur',             nativeName: 'ئۇيغۇرچە',           flag: '🇨🇳' },
  { code: 'uk', name: 'Ukrainian',          nativeName: 'Українська',         flag: '🇺🇦' },
  { code: 'ur', name: 'Urdu',               nativeName: 'اردو',               flag: '🇵🇰' },
  { code: 'uz', name: 'Uzbek',              nativeName: "O'zbek",             flag: '🇺🇿' },
  { code: 've', name: 'Venda',              nativeName: 'Tshivenḓa',          flag: '🇿🇦' },
  { code: 'vi', name: 'Vietnamese',         nativeName: 'Tiếng Việt',         flag: '🇻🇳' },
  { code: 'vo', name: 'Volapük',            nativeName: 'Volapük',            flag: '🌐' },
  { code: 'wa', name: 'Walloon',            nativeName: 'Walon',              flag: '🇧🇪' },
  { code: 'cy', name: 'Welsh',              nativeName: 'Cymraeg',            flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'wo', name: 'Wolof',              nativeName: 'Wollof',             flag: '🇸🇳' },
  { code: 'fy', name: 'Western Frisian',    nativeName: 'Frysk',              flag: '🇳🇱' },
  { code: 'xh', name: 'Xhosa',              nativeName: 'isiXhosa',           flag: '🇿🇦' },
  { code: 'yi', name: 'Yiddish',            nativeName: 'ייִדיש',              flag: '🌐' },
  { code: 'yo', name: 'Yoruba',             nativeName: 'Yorùbá',             flag: '🇳🇬' },
  { code: 'za', name: 'Zhuang',             nativeName: 'Saɯ cueŋƅ',         flag: '🇨🇳' },
  { code: 'zu', name: 'Zulu',               nativeName: 'isiZulu',            flag: '🇿🇦' },
];

interface SiteLanguage {
  id: number;
  language_code: string;
  status: string;
  is_default: boolean;
  is_paid_extra: boolean;
}

interface ResolvedLang { code: string; name: string; flag: string }

function LanguagesPageContent({ initialSiteId }: { initialSiteId?: string }) {
  const { setOpenMobile } = useSidebar();
  const { sites, isLoading: sitesLoading } = usePlatform();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(initialSiteId ?? null);
  const [languages, setLanguages] = useState<SiteLanguage[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Combobox state
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<ResolvedLang | null>(null);
  // OpenAI fallback
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-select: priorité au siteId de l'URL, sinon le premier site disponible
  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) {
      setSelectedSiteId(initialSiteId ?? String(sites[0].id));
    }
  }, [sites, selectedSiteId, initialSiteId]);

  const loadLanguages = useCallback(async (siteId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/site-builder/sites/${siteId}/languages`);
      setLanguages(res.data.data ?? []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les langues.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedSiteId) loadLanguages(selectedSiteId);
  }, [selectedSiteId, loadLanguages]);

  // Fermer dropdown si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeLangCodes = new Set(languages.map(l => l.language_code));

  // Filtrer la liste ISO en temps réel
  const filtered = query.trim().length === 0 ? [] : ALL_LANGUAGES.filter(l => {
    if (activeLangCodes.has(l.code)) return false;
    const q = query.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  // Si 0 résultat dans la liste ISO et query >= 2 chars → fallback OpenAI (debounced)
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelected(null);
    setResolveError('');
    setShowDropdown(value.trim().length >= 1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Déclencher OpenAI seulement si aucun résultat dans la liste
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        const currentFiltered = ALL_LANGUAGES.filter(l => {
          if (activeLangCodes.has(l.code)) return false;
          const q = value.toLowerCase();
          return l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q) || l.code.toLowerCase().includes(q);
        });
        if (currentFiltered.length === 0) {
          setResolving(true);
          try {
            const res = await api.post('/site-builder/resolve-language', { input: value.trim() });
            const lang = res.data.data as ResolvedLang;
            if (!activeLangCodes.has(lang.code)) {
              setSelected(lang);
              setShowDropdown(false);
            }
          } catch (e: any) {
            setResolveError(e?.response?.data?.message ?? 'Langue non reconnue.');
          } finally {
            setResolving(false);
          }
        }
      }, 700);
    }
  };

  const handleSelect = (lang: { code: string; name: string; flag: string }) => {
    setSelected(lang);
    setQuery(lang.name);
    setShowDropdown(false);
    setResolveError('');
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    setResolveError('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleAdd = async () => {
    if (!selectedSiteId || !selected) return;
    setAdding(true);
    try {
      await api.post(`/site-builder/sites/${selectedSiteId}/languages`, { language_code: selected.code });
      handleClear();
      await loadLanguages(selectedSiteId);
      toast({ title: 'Langue ajoutée', description: `${selected.flag} ${selected.name} a été configurée.` });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Impossible d\'ajouter cette langue.';
      const reasonCode = e?.response?.data?.reason_code;
      if (reasonCode === 'LANGUAGE_QUOTA_EXCEEDED') {
        try {
          const langLabel = `${selected.flag} ${selected.name}`;
          const extraPrice: number = e?.response?.data?.extra_price ?? 15000;
          const order = await createPurchase({
            source: 'site-language',
            sourceItemId: `${selectedSiteId}|${selected.code}`,
            itemName: `Langue supplémentaire — ${langLabel}`,
            itemDescription: `Ajout de la langue ${langLabel} sur votre site Pixel Rise (hors quota inclus du plan)`,
            priceEur: 0,
            priceAriary: extraPrice,
          });
          navigate(`/purchases/invoice/${order.id}`);
        } catch {
          toast({ title: 'Quota atteint', description: msg + ' (+15 000 Ar/langue/mois)', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Erreur', description: msg, variant: 'destructive' });
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (langId: number) => {
    if (!selectedSiteId) return;
    try {
      await api.delete(`/site-builder/sites/${selectedSiteId}/languages/${langId}`);
      await loadLanguages(selectedSiteId);
      toast({ title: 'Langue supprimée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.response?.data?.message ?? 'Impossible de supprimer.', variant: 'destructive' });
    }
  };

  const handleSetDefault = async (langId: number) => {
    if (!selectedSiteId) return;
    try {
      await api.post(`/site-builder/sites/${selectedSiteId}/languages/${langId}/set-default`);
      await loadLanguages(selectedSiteId);
      toast({ title: 'Langue par défaut mise à jour' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de changer la langue par défaut.', variant: 'destructive' });
    }
  };

  const selectedSite = sites.find(s => String(s.id) === selectedSiteId);
  const sitePlanKey = (selectedSite as any)?.effectivePlanKey ?? 'draft';
  const includedCount = LANGUAGES_PER_PLAN[sitePlanKey] ?? 1;
  const usedCount = languages.length;
  const extraCount = Math.max(0, usedCount - includedCount);

  const getLangInfo = (code: string) => {
    const found = ALL_LANGUAGES.find(l => l.code === code);
    return found ? { code: found.code, name: found.name, flag: found.flag } : { code, name: code.toUpperCase(), flag: '🌐' };
  };

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-4 px-6 border-b bg-background shrink-0">
        <button className="md:hidden p-2 rounded-md hover:bg-accent" onClick={() => setOpenMobile(true)}>
          <Languages className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Languages className="w-5 h-5 text-sky-500" />
          <h1 className="text-lg font-semibold">Langues</h1>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Sélecteur de site */}
        {sites.length > 1 && (
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={selectedSiteId ?? ''} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choisir un site…" />
              </SelectTrigger>
              <SelectContent>
                {sites.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Info quota plan */}
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-sky-600" />
              <div>
                <p className="text-sm font-semibold text-sky-800">
                  {usedCount} / {includedCount} langue{includedCount > 1 ? 's' : ''} incluse{includedCount > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-sky-600 mt-0.5">
                  Plan {sitePlanKey.charAt(0).toUpperCase() + sitePlanKey.slice(1)} — langue supplémentaire : +15 000 Ar/mois
                </p>
              </div>
            </div>
            {extraCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-auto">
                {extraCount} langue{extraCount > 1 ? 's' : ''} payante{extraCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Langues actives */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Langues configurées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sitesLoading || loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement…</span>
              </div>
            ) : languages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Globe className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucune langue configurée pour ce site.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {languages.map(lang => {
                  const info = getLangInfo(lang.language_code);
                  return (
                    <div key={lang.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                      <span className="text-xl">{info.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{info.name}</p>
                        <p className="text-xs text-muted-foreground">{lang.language_code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lang.is_default && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-1">
                            <Star className="w-3 h-3" /> Défaut
                          </Badge>
                        )}
                        {lang.is_paid_extra && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                            Payante
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!lang.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-blue-600"
                            onClick={() => handleSetDefault(lang.id)}
                            title="Définir comme langue par défaut"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {!lang.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(lang.id)}
                            title="Supprimer cette langue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ajouter une langue — Combobox + fallback OpenAI */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Ajouter une langue
              </CardTitle>
              <span className="flex items-center gap-1 text-xs text-indigo-500 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                IA si introuvable
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Prix affiché clairement */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                {usedCount < includedCount
                  ? <>La prochaine langue est <strong>incluse dans votre plan</strong>. Les suivantes seront facturées <strong>+15 000 Ar/mois</strong>.</>
                  : <>Quota inclus atteint. Cette langue sera facturée <strong>+15 000 Ar/mois</strong>. Vous serez redirigé vers la facture.</>
                }
              </p>
            </div>

            {/* Input + bouton Ajouter côte à côte */}
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onFocus={() => query.trim().length >= 1 && setShowDropdown(true)}
                  placeholder="ex: French, Malagasy, 中文, Espagnol…"
                  className="pl-9 pr-8"
                  disabled={adding}
                />
                {resolving && (
                  <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
                )}

                {/* Dropdown liste ISO */}
                {showDropdown && filtered.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden"
                  >
                    {filtered.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onMouseDown={() => handleSelect(lang)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{lang.name}</span>
                          {lang.nativeName !== lang.name && (
                            <span className="text-xs text-muted-foreground ml-1.5">{lang.nativeName}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono bg-slate-100 px-1.5 py-0.5 rounded">{lang.code}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* IA en cours */}
                {showDropdown && filtered.length === 0 && query.trim().length >= 2 && resolving && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg px-3 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                    Recherche avec l'IA…
                  </div>
                )}
              </div>

              {/* Bouton Ajouter — toujours visible */}
              <Button
                onClick={handleAdd}
                disabled={adding || !selected || !selectedSiteId}
                className="gap-2 bg-sky-500 hover:bg-sky-600 text-white shrink-0"
              >
                {adding
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Plus className="w-4 h-4" />
                }
                {usedCount >= includedCount ? 'Acheter (+15 000 Ar)' : 'Ajouter'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Tapez le nom dans n'importe quelle langue. Si introuvable dans la liste, l'IA identifie automatiquement.
            </p>

            {/* Aperçu langue sélectionnée */}
            {selected && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-green-200 bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-xl">{selected.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">{selected.name}</p>
                  <p className="text-xs text-green-600 font-mono">{selected.code}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-7 px-2 text-muted-foreground hover:text-destructive shrink-0"
                  title="Annuler"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Langue déjà ajoutée (selected mais code existant) */}
            {selected && activeLangCodes.has(selected.code) && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Cette langue est déjà configurée pour ce site.</p>
              </div>
            )}

            {/* Erreur résolution IA */}
            {resolveError && !resolving && !selected && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-red-200 bg-red-50">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{resolveError}</p>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}

export default function LanguagesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  return (
    <DashboardLayout>
      <PlatformProvider>
        <LanguagesPageContent initialSiteId={siteId} />
      </PlatformProvider>
    </DashboardLayout>
  );
}
