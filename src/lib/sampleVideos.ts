import { VideoSpeakerSegment } from './geminiApi';

export interface DemoProject {
  id: string;
  projectName: string;
  videoTitle: string;
  videoUrl: string;
  duration: number;
  segments: VideoSpeakerSegment[];
}

export const SAMPLE_PROJECT_ALPHA: DemoProject = {
  id: 'project_alpha',
  projectName: 'Project_Alpha',
  videoTitle: 'AI Tech & Infrastructure Presentation',
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  duration: 15.0,
  segments: [
    {
      id: 'seg-1',
      segmentNumber: 1,
      speakerId: 'Voice #1',
      startTime: 0.5,
      endTime: 5.0,
      originalText: 'Logistics and infrastructure challenges remain a major hurdle in emerging tech ecosystems.',
      khmerTranslation: 'បញ្ហាប្រឈមនៃប្រព័ន្ធភស្តុភារ និងហេដ្ឋារចនាសម្ព័ន្ធ នៅតែជាឧបសគ្គចម្បងក្នុងការអភិវឌ្ឍបច្ចេកវិទ្យា។',
      status: 'ready_for_sync',
    },
    {
      id: 'seg-2',
      segmentNumber: 2,
      speakerId: 'Voice #2',
      startTime: 5.2,
      endTime: 10.0,
      originalText: "Cloud AI and autonomous computing can bridge this gap quickly and efficiently.",
      khmerTranslation: 'បច្ចេកវិទ្យា Cloud AI និងប្រព័ន្ធស្វ័យប្រវត្តិ អាចជួយដោះស្រាយបញ្ហានេះបានយ៉ាងរហ័ស និងមានប្រសិទ្ធភាព។',
      status: 'ready_for_sync',
    },
    {
      id: 'seg-3',
      segmentNumber: 3,
      speakerId: 'Voice #3',
      startTime: 10.2,
      endTime: 14.8,
      originalText: 'Multi-lingual AI dubbing is bringing worldwide knowledge directly to local audiences.',
      khmerTranslation: 'ការបកប្រែសំឡេងឆ្លាតវៃ AI កំពុងនាំយកចំណេះដឹងទូទាំងពិភពលោកមកកាន់អ្នកប្រើប្រាស់ក្នុងស្រុក។',
      status: 'ready_for_sync',
    },
  ],
};
