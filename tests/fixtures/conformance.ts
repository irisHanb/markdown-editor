// docs/markdown-editor-spec.md 예제 → 기대 HTML. 범위·정규화 규칙은
// specs/001-single-screen-editor/contracts/render-pipeline.md "fixture 범위"·"알려진 차이".
// wrapped: 명세가 조각 HTML만 적어 렌더 결과 전체가 되도록 감싼 항목.

export type ConformanceCase = {
  section: string;
  markdown: string;
  html: string;
  wrapped?: true;
};

export const conformanceCases: ConformanceCase[] = [
  // §3.1 ATX 제목
  {
    section: "3.1",
    markdown: "# foo\n## foo\n### foo\n#### foo\n##### foo\n###### foo",
    html: "<h1>foo</h1>\n<h2>foo</h2>\n<h3>foo</h3>\n<h4>foo</h4>\n<h5>foo</h5>\n<h6>foo</h6>",
  },
  { section: "3.1", markdown: "####### foo", html: "<p>####### foo</p>" },
  { section: "3.1", markdown: "## foo ##", html: "<h2>foo</h2>" },
  { section: "3.1", markdown: "##", html: "<h2></h2>" },
  { section: "3.1", markdown: "# foo *bar*", html: "<h1>foo <em>bar</em></h1>" },
  // §3.2 Setext 제목
  { section: "3.2", markdown: "Foo\n===\n\nFoo\n---", html: "<h1>Foo</h1>\n<h2>Foo</h2>" },
  // §3.3 인용구
  {
    section: "3.3",
    markdown: "> # Foo\n> bar\n> baz",
    html: "<blockquote>\n  <h1>Foo</h1>\n  <p>bar baz</p>\n</blockquote>",
  },
  // §3.4 순서 없는 목록
  {
    section: "3.4",
    markdown: "- foo\n- bar\n- baz",
    html: "<ul>\n  <li>foo</li>\n  <li>bar</li>\n  <li>baz</li>\n</ul>",
  },
  // §3.5 순서 있는 목록
  {
    section: "3.5",
    markdown: "1. foo\n2. bar\n3. baz",
    html: "<ol>\n  <li>foo</li>\n  <li>bar</li>\n  <li>baz</li>\n</ol>",
  },
  { section: "3.5", markdown: "5. a", html: '<ol start="5"><li>a</li></ol>', wrapped: true },
  // §3.6 펜스 코드 블록
  {
    section: "3.6",
    markdown: "```ruby\ndef foo(x)\n  return 3\nend\n```",
    html: '<pre><code class="language-ruby">def foo(x)\n  return 3\nend\n</code></pre>',
  },
  // §3.7 들여쓰기 코드 블록
  {
    section: "3.7",
    markdown: "    a simple\n      indented code block",
    html: "<pre><code>a simple\n  indented code block\n</code></pre>",
  },
  // §3.8 구분선
  { section: "3.8", markdown: "***\n---\n___", html: "<hr />\n<hr />\n<hr />" },
  // §3.9 단락
  { section: "3.9", markdown: "aaa\n\nbbb", html: "<p>aaa</p>\n<p>bbb</p>" },
  // §4.1 굵게
  { section: "4.1", markdown: "**foo bar**", html: "<p><strong>foo bar</strong></p>" },
  { section: "4.1", markdown: "__foo bar__", html: "<p><strong>foo bar</strong></p>" },
  // §4.2 기울임
  { section: "4.2", markdown: "*foo bar*", html: "<p><em>foo bar</em></p>" },
  { section: "4.2", markdown: "_foo bar_", html: "<p><em>foo bar</em></p>" },
  { section: "4.2", markdown: "foo*bar*", html: "<p>foo<em>bar</em></p>", wrapped: true },
  // §4.3 굵은 기울임
  { section: "4.3", markdown: "***foo***", html: "<p><em><strong>foo</strong></em></p>" },
  // §4.4 인라인 코드
  { section: "4.4", markdown: "`foo`", html: "<p><code>foo</code></p>" },
  { section: "4.4", markdown: "``foo`bar``", html: "<p><code>foo`bar</code></p>", wrapped: true },
  { section: "4.4", markdown: "` foo `", html: "<p><code>foo</code></p>", wrapped: true },
  { section: "4.4", markdown: "`foo\\`bar`", html: "<p><code>foo\\</code>bar`</p>", wrapped: true },
  // §4.5 인라인 링크
  { section: "4.5", markdown: '[link](/uri "title")', html: '<p><a href="/uri" title="title">link</a></p>' },
  { section: "4.5", markdown: "[link](/uri)", html: '<p><a href="/uri">link</a></p>' },
  // §4.6 참조 링크
  {
    section: "4.6",
    markdown: '[foo]\n\n[foo]: /url "title"',
    html: '<p><a href="/url" title="title">foo</a></p>',
  },
  // §4.7 이미지
  {
    section: "4.7",
    markdown: '![foo](/url "title")',
    html: '<p><img src="/url" alt="foo" title="title" /></p>',
  },
  { section: "4.7", markdown: "![foo](/url)", html: '<p><img src="/url" alt="foo" /></p>' },
  // §4.8 자동 링크
  {
    section: "4.8",
    markdown: "<https://example.com>",
    html: '<p><a href="https://example.com">https://example.com</a></p>',
  },
  {
    section: "4.8",
    markdown: "<foo@bar.example.com>",
    html: '<p><a href="mailto:foo@bar.example.com">foo@bar.example.com</a></p>',
  },
  // §4.9 강제 줄바꿈 (명세 문법 블록의 두 방식을 각각 검증)
  { section: "4.9", markdown: "foo  \nbar", html: "<p>\n  foo<br />\n  bar\n</p>" },
  { section: "4.9", markdown: "foo\\\nbar", html: "<p>\n  foo<br />\n  bar\n</p>" },
  // §5.1 백슬래시 이스케이프
  { section: "5.1", markdown: "\\*not emphasized*", html: "<p>*not emphasized*</p>" },
  // §5.2 엔티티 (명세는 디코딩된 문자로 적음 → 출력에서 &는 다시 &amp;로 이스케이프됨)
  { section: "5.2", markdown: "&amp; &copy; &AElig;", html: "<p>&amp; © Æ</p>", wrapped: true },
  { section: "5.2", markdown: "&#35;", html: "<p>#</p>", wrapped: true },
  { section: "5.2", markdown: "&#X22;", html: '<p>"</p>', wrapped: true },
  // §5.3 원시 HTML
  { section: "5.3", markdown: "<del>*foo*</del>", html: "<p><del><em>foo</em></del></p>" },
  // §7.1 취소선 (GFM)
  { section: "7.1", markdown: "~~foo~~", html: "<p><del>foo</del></p>", wrapped: true },
  // §7.2 표 (GFM)
  {
    section: "7.2",
    markdown: "| 헤더1 | 헤더2 |\n| --- | --- |\n| a | b |",
    html:
      "<table>\n  <thead>\n    <tr>\n      <th>헤더1</th>\n      <th>헤더2</th>\n    </tr>\n  </thead>\n" +
      "  <tbody>\n    <tr>\n      <td>a</td>\n      <td>b</td>\n    </tr>\n  </tbody>\n</table>",
  },
  // §7.3 작업 목록 (GFM)
  {
    section: "7.3",
    markdown: "- [ ] foo",
    html: '<ul><li><input type="checkbox" disabled> foo</li></ul>',
    wrapped: true,
  },
  {
    section: "7.3",
    markdown: "- [x] foo",
    html: '<ul><li><input type="checkbox" checked disabled> foo</li></ul>',
    wrapped: true,
  },
  // §7.4 자동 링크 리터럴 (GFM)
  {
    section: "7.4",
    markdown: "www.example.com",
    html: '<p><a href="http://www.example.com">www.example.com</a></p>',
    wrapped: true,
  },
];
