// 临时冒烟测试：用全局桩 + 标准 require 加载 app.js，验证纯逻辑部分
// 运行方式：node .smoke-test.js
const fs = require('fs');
const path = require('path');

// ---- 环境桩（挂在 global 上，require 时对模块可见）----
function makeEl() {
    return {
        _text: '',
        style: {},
        dataset: {},
        set textContent(v) { this._text = String(v); },
        get textContent() { return this._text; },
        get innerHTML() {
            return this._text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    };
}
global.window = {};
global.navigator = {};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
    readyState: 'loading',
    addEventListener: () => {},
    createElement: makeEl,
    body: { appendChild: () => {}, removeChild: () => {}, style: {} },
    documentElement: { style: {}, setAttribute: () => {} },
    getElementById: () => null,
    querySelectorAll: () => [],
};
global.marked = {
    setOptions() {},
    use() {},
    Renderer: function () {},
    parse(md) { return '<p>' + md + '</p>'; },
    parseInline(s) { return s; },
};
global.DOMPurify = { sanitize: (h) => h };
global.hljs = { getLanguage: () => true, highlightElement: () => {} };
global.alert = () => {};

// 把 app.js 包装成 CommonJS 模块后加载并导出待测函数
const src = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
fs.writeFileSync(path.join(__dirname, '.smoke-app.cjs'),
    src + '\nmodule.exports = { preprocessCustomSyntax, buildSelectionAlignment };\n', 'utf8');
const { preprocessCustomSyntax: pp, buildSelectionAlignment: align } = require('./.smoke-app.cjs');

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
    if (cond) { passed += 1; console.log('PASS  ' + name); }
    else { failed += 1; console.log('FAIL  ' + name + (detail ? '\n      -> ' + detail : '')); }
}

// ---- 1. 脚注 (#2) ----
{
    const md = [
        '正文引用[^1]，再来一个[^note-2]。',
        '',
        '[^1]: 这是**脚注一**。',
        '[^note-2]: 第二条内容',
        '',
        '结尾段落',
    ].join('\n');
    const out = pp(md);
    check('脚注：定义行被移除', !out.includes('[^1]:'), out);
    check('脚注：引用被替换为 sup 链接', out.includes('<sup class="footnote-ref" id="fnref-1"><a href="#fn-1">1</a></sup>'), out);
    check('脚注：第二个标签按出现顺序编号', out.includes('<a href="#fn-2">2</a></sup>'), out);
    check('脚注：文末生成 section', out.includes('<section class="footnotes">') && out.includes('<li id="fn-1">') && out.includes('<li id="fn-2">'), out);
    check('脚注：包含回链', out.includes('<a href="#fnref-1" class="footnote-backref"'), out);
    const outUndef = pp('没有定义的[^404]引用');
    check('脚注：无定义时保留原文且不生成 section', outUndef.includes('[^404]') && !outUndef.includes('footnotes'), outUndef);
}

// 脚注跨多行（缩进续行）
{
    const md = 'a[^1]\n\n[^1]: 第一行\n    续行内容\n\n下一段';
    const out = pp(md);
    check('脚注：缩进续行并入同一定义', /第一行\s*续行内容/.test(out), out);
    check('脚注：续行后的段落不被吞掉', out.includes('下一段'), out);
}

// ---- 2. 引用卡片落款 (#3) ----
{
    const md = ':::quote\n优美的句子。\n<right>—— 某某作者</right>\n:::';
    const out = pp(md);
    check('quote-card：<right> 转为 span.quote-author', out.includes('<span class="quote-author">—— 某某作者</span>') && !out.includes('<right>'), out);
    check('quote-card：容器类名保留', out.includes('<div class="quote-card">'), out);
}

// ---- 3. 代码保护 ----
{
    const md = '```\n==不是彩虹==\n!!不是剧透!!\n{不是}(ruby)\n```\n==真彩虹==';
    const out = pp(md);
    check('代码块内的自定义语法不被处理', out.includes('==不是彩虹==') && out.includes('!!不是剧透!!') && out.includes('{不是}(ruby)'), out);
    check('代码块外的语法正常处理', out.includes('<span class="rainbow-text">真彩虹</span>'), out);
}

// ---- 4. 其他自定义语法回归 ----
{
    const out = pp('{汉字}(hàn zì)');
    check('ruby：单读音', out.includes('<ruby>汉字<rt>hàn zì</rt></ruby>'), out);
    const out2 = pp('{汉字}(hàn|zì)');
    check('ruby：逐字读音', out2.includes('汉<rt>hàn</rt>') && out2.includes('字<rt>zì</rt>'), out2);
    const out3 = pp(':::tip{name="自定义标题"}\n内容\n:::');
    check('admonition：自定义标题', out3.includes('<div class="admonition-title">自定义标题</div>'), out3);
    const out4 = pp('::github{repo="facebook/react"}');
    check('github 卡片生成', out4.includes('data-repo="facebook/react"') && out4.includes('gc-repo'), out4);
    const out5 = pp('::music{id="1404885291"}');
    check('music 卡片生成', out5.includes('data-song-id="1404885291"'), out5);
    const out6 = pp('![说明](https://a.b/c.png "图片标题")');
    check('figure 图片', out6.includes('<figure><img src="https://a.b/c.png"'), out6);
}

// ---- 5. 选区对齐算法 ----
{
    const r1 = align('hello world', 'hello world');
    check('对齐：相同文本端点映射到末端', r1.sourceToPreviewBoundary[11] === 11 && r1.previewToSourceBoundary[11] === 11,
        JSON.stringify(r1.sourceToPreviewBoundary));

    // 语法符号被跳过："# 标题" -> "标题"
    const r2 = align('# 标题', '标题');
    check('对齐：# 与空格被跳过，文字对上', r2.sourceToPreviewBoundary[2] === 0 && r2.sourceToPreviewBoundary[4] === 2,
        JSON.stringify(r2.sourceToPreviewBoundary));

    const r3 = align('**bold** 和 *斜体*', 'bold 和 斜体');
    let mono = true;
    for (let i = 1; i < r3.sourceToPreviewBoundary.length; i++) {
        if (r3.sourceToPreviewBoundary[i] < r3.sourceToPreviewBoundary[i - 1]) mono = false;
    }
    check('对齐：边界数组单调且长度正确',
        mono && r3.sourceToPreviewBoundary.length === '**bold** 和 *斜体*'.length + 1, '');

    const r4 = align('', '');
    check('对齐：空输入', r4.sourceToPreviewBoundary.length === 1, '');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
try { fs.unlinkSync(path.join(__dirname, '.smoke-app.cjs')); } catch (e) {}
process.exit(failed > 0 ? 1 : 0);
