import { byName } from "./names";
import type { Repository } from "./repository";

// 시작 시 1회: 기존 문서 옮기기·첫 방문 샘플·열 문서 결정 (specs/004-folder-storage research R3).
export const LEGACY_KEY = "mdeditor:v1";
export const DEFAULT_FOLDER = "내 문서";
export const LEGACY_TITLE = "제목 없는 문서";
export const SAMPLE_TITLE = "시작하기";

function readLegacy(legacy: Storage | null): string | null {
  try {
    return legacy?.getItem(LEGACY_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * 반환: 열 문서 id (lastDocId → 없으면 이름순 첫 폴더의 이름순 첫 문서 → 없으면 null).
 * removeLegacy=false(메모리 저장소 모드)면 저장본을 지우지 않는다 — 새로고침하면 메모리가 비어
 * 지우면 기존 문서가 영구 손실된다 (analyze U1).
 */
export async function bootstrap(
  repo: Repository,
  legacy: Storage | null,
  sample: string,
  opts: { removeLegacy: boolean },
): Promise<string | null> {
  if (!(await repo.getMeta("legacyImported"))) {
    const saved = readLegacy(legacy);
    if (saved !== null) {
      await repo.seed(DEFAULT_FOLDER, LEGACY_TITLE, saved); // 실패하면 여기서 reject — 저장본 유지
      if (opts.removeLegacy) {
        try {
          legacy?.removeItem(LEGACY_KEY);
        } catch {
          // 플래그가 이미 섰으므로 다시 옮기지 않는다.
        }
      }
    } else if ((await repo.listFolders()).length === 0) {
      await repo.seed(DEFAULT_FOLDER, SAMPLE_TITLE, sample);
    } else {
      await repo.setMeta("legacyImported", true);
    }
  }

  const last = await repo.getMeta("lastDocId");
  if (last && (await repo.getDocument(last))) return last;

  const [folders, docs] = await Promise.all([repo.listFolders(), repo.listDocuments()]);
  for (const f of folders.sort(byName((x) => x.name))) {
    const first = docs.filter((d) => d.folderId === f.id).sort(byName((d) => d.title))[0];
    if (first) return first.id;
  }
  return null;
}
