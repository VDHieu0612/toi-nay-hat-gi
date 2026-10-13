/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SONGS_SHEET_VIEW_URL?: string;
  readonly VITE_SONGS_SHEET_CSV_URL?: string;
  readonly VITE_SONG_REQUEST_FORM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
