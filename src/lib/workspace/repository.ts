// 폴더·문서 저장소 계약 (specs/004-folder-storage/contracts/repository.md, data-model.md).

export type Folder = {
  id: string;
  /** 1–50자, `/`·`\` 금지, 폴더끼리 대소문자 무시 중복 금지 (호출부가 validateName으로 검사) */
  name: string;
  /** 이번 단계는 항상 null(루트). 중첩 확장용 */
  parentId: null;
  collapsed: boolean;
  createdAt: number;
};

export type Doc = {
  id: string;
  folderId: string;
  /** 1–50자, `/`·`\` 금지, 같은 폴더 안 대소문자 무시 중복 금지 */
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type DocPatch = { content?: string; title?: string; folderId?: string };

export type Meta = {
  lastDocId: string | null;
  legacyImported: true;
  /** .md 파일을 쓸 연결 폴더 — FileSystemDirectoryHandle(구조화 복제 가능) (specs/008-md-file-export FR-002) */
  exportDir: unknown;
};

export interface Repository {
  listFolders(): Promise<Folder[]>;
  listDocuments(): Promise<Doc[]>;
  getDocument(id: string): Promise<Doc | undefined>;

  createFolder(name: string): Promise<Folder>;
  renameFolder(id: string, name: string): Promise<void>;
  setCollapsed(id: string, collapsed: boolean): Promise<void>;
  /** 폴더와 소속 문서를 한 번에 삭제. 삭제한 문서 수 반환 (FR-015) */
  deleteFolder(id: string): Promise<number>;

  createDocument(folderId: string, title: string, content?: string): Promise<Doc>;
  renameDocument(id: string, title: string): Promise<void>;
  /** 본문·제목·폴더를 한 번에 갱신하고 updatedAt 갱신. 대상 폴더·문서가 없으면 reject (M6 research R4) */
  updateDocument(id: string, patch: DocPatch): Promise<void>;
  deleteDocument(id: string): Promise<void>;

  getMeta<K extends keyof Meta>(key: K): Promise<Meta[K] | undefined>;
  setMeta<K extends keyof Meta>(key: K, value: Meta[K]): Promise<void>;

  /** 폴더(이름 기준 재사용) + 문서 + legacyImported 플래그를 한 번에 생성 (research R3) */
  seed(folderName: string, title: string, content: string): Promise<Doc>;
}

export const newFolder = (name: string): Folder => ({
  id: crypto.randomUUID(),
  name,
  parentId: null,
  collapsed: false,
  createdAt: Date.now(),
});

export const newDoc = (folderId: string, title: string, content = ""): Doc => {
  const now = Date.now();
  return { id: crypto.randomUUID(), folderId, title, content, createdAt: now, updatedAt: now };
};
