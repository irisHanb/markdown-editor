"use client";

import { Fragment } from "react";
import { strings } from "@/content/strings";
import { pluginGroups } from "@/plugins";
import type { MarkdownPlugin } from "@/plugins/types";

type Props = {
  /** 실행은 EditorScreen.runPlugin 한 곳 — 툴바는 플러그인 종류를 모른다 (헌장 원칙 I) */
  onRun: (plugin: MarkdownPlugin) => void;
  activeIds: ReadonlySet<string>;
  /** 툴팁 문자열 (단축키 표기 포함). 없으면 label */
  titleOf?: (plugin: MarkdownPlugin) => string;
};

export function Toolbar({ onRun, activeIds, titleOf = (p) => p.label }: Props) {
  return (
    <div role="toolbar" aria-label={strings.toolbarLabel} className="flex flex-wrap items-center gap-0.5">
      {pluginGroups.map((group, i) => (
        <Fragment key={group[0]?.id ?? i}>
          {i > 0 && <span className="mx-[5px] h-5 w-px bg-[#e7ebf2]" aria-hidden="true" />}
          {group.map((plugin) => {
            const Icon = plugin.icon;
            const pressed = plugin.isActive ? activeIds.has(plugin.id) : undefined;
            return (
              <button
                key={plugin.id}
                type="button"
                aria-label={plugin.label}
                aria-pressed={pressed}
                title={titleOf(plugin)}
                // 클릭해도 편집 영역 선택·포커스를 유지한다
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onRun(plugin)}
                className={`inline-flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
                  pressed ? "bg-[#e8edfb] text-[var(--accent)]" : "text-[#4a5568] hover:bg-[#f1f3f9] hover:text-[#1f2a44]"
                }`}
              >
                <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
