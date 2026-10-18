export interface KhmerPreset {
  id: string;
  category: 'formal' | 'news' | 'conversational' | 'story' | 'technology';
  titleKhmer: string;
  titleEnglish: string;
  targetText: string;
}

export const KHMER_PRESETS: KhmerPreset[] = [
  {
    id: 'kh-intro',
    category: 'conversational',
    titleKhmer: 'ស្វាគមន៍ទូទៅ (Casual Greeting)',
    titleEnglish: 'Friendly Greeting',
    targetText: 'ជំរាបសួរ! សូមស្វាគមន៍មកកាន់ប្រព័ន្ធបម្លែងសំឡេងឆ្លាតវៃ VoxCPM 2។ យើងខ្ញុំមានសេចក្តីសោមនស្សរីករាយក្នុងការផ្តល់ជូននូវបច្ចេកវិទ្យាសំឡេងសិប្បនិម្មិតកម្រិតខ្ពស់សម្រាប់ភាសាខ្មែរ។',
  },
  {
    id: 'kh-news',
    category: 'news',
    titleKhmer: 'ព័ត៌មានទាន់ហេតុការណ៍ (News Broadcast)',
    titleEnglish: 'Formal News Announcement',
    targetText: 'ក្រសួងប្រៃសណីយ៍ និងទូរគមនាគមន៍ បានប្រកាសដាក់ឱ្យប្រើប្រាស់កម្មវិធីបញ្ញាសិប្បនិម្មិតថ្មី ដែលជួយសម្រួលដល់ការបកប្រែ និងការអានអត្ថបទជាភាសាខ្មែរដោយស្វ័យប្រវត្តិ។ នេះជាការបោះជំហានដ៏សំខាន់មួយក្នុងការអភិវឌ្ឍវិស័យឌីជីថលនៅកម្ពុជា។',
  },
  {
    id: 'kh-tech',
    category: 'technology',
    titleKhmer: 'បច្ចេកវិទ្យាបញ្ញាសិប្បនិម្មិត (AI & Tech)',
    titleEnglish: 'AI & Cloud Computing',
    targetText: 'ប្រព័ន្ធ VoxCPM 2 ដំណើរការដោយប្រើប្រាស់ម៉ូដែល Diffusion Autoregressive ដែលអាចចម្លងសំឡេងដើមបានយ៉ាងច្បាស់លាស់ ដោយគ្រាន់តែប្រើប្រាស់សំឡេងគំរូរយៈពេលខ្លីត្រឹមតែ ៣ ទៅ ៦ វិនាទីប៉ុណ្ណោះ។ ការដំណើរការលើ Cloud GPU ជួយសន្សំសំចៃថាមពលកុំព្យូទ័ររបស់អ្នកប្រើប្រាស់។',
  },
  {
    id: 'kh-story',
    category: 'story',
    titleKhmer: 'និទានរឿង និងអក្សរសិល្ប៍ (Story Narration)',
    titleEnglish: 'Story Narration',
    targetText: 'កាលពីព្រេងនាយ មានសត្វទន្សាយមួយក្បាល និងអណ្តើកមួយក្បាល បានប្រកួតរត់ប្រណាំងគ្នា។ ទន្សាយដោយអាងថាខ្លួនរត់លឿន ក៏ឈប់សម្រាកដេកលក់ក្រោមដើមឈើ។ ចំណែកអណ្តើកទោះបីដើរយឺត តែបានព្យាយាមដើរឥតឈប់រហូតដល់គោលដៅ និងបានទទួលជ័យជំនះ។',
  }
];
