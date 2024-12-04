export type ResponseData = {
  response_text: string;
  task_doc_id: string;
  leaf_id: number;
  leaf_path_list: string[];
  instruction_prompt: string;
  created_at: Date;
  audio_file_url?: string; // Make audio_file_url optional
  user_id: string;
};
