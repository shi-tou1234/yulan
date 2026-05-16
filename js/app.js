// ===== 默认示例内容 =====
const defaultContent = `# 简单的 Markdown 语法（速查）

这篇文章整理了常用 Markdown 语法，适合作为写作时的速查手册。

参考来源：https://note.motues.top/docs/Markdown/use

---

## 标题

使用 \`#\` 到 \`######\` 表示 1 到 6 级标题。

# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题

---

## 段落与换行

段落之间空一行；行内换行可在行尾添加两个空格。

这是第一段。

这是第二段。  
这是同一段中的下一行。

---

## 文本强调

**粗体**

*斜体*

***粗斜体***

~~删除线~~

---

## 引用

> 这是一段引用

>> 这是嵌套引用

---

## 代码

行内代码用反引号包裹：

使用 \`console.log\` 输出日志。

代码块用三个反引号：

\`\`\`ts
const name = "Markdown";
console.log(name);
\`\`\`

---

## 列表

### 无序列表

- 第一项
- 第二项
- 第三项

### 有序列表

1. 第一项
2. 第二项
3. 第三项

### 任务列表

- [x] 已完成
- [ ] 待完成

---

## 链接与图片

[访问网站](https://example.com)

![图片说明](https://picsum.photos/400/200)

---

## 表格

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| Markdown | 标记语言 | 轻量、易读 |

对齐示例：

| 左对齐 | 居中 | 右对齐 |
| :--- | :---: | ---: |
| A | B | C |
| 左 | 中 | 右 |

---

## 公式（KaTeX）

行内公式：

勾股定理：$a^2+b^2=c^2$

块级公式：

$$
\\int_a^b f(x)\\,dx
$$

二次方程求根公式：

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

---

## 提示卡片

:::tip
这是一个提示卡片。
:::

---

## 水平线

---

**完**
`;

// ===== DOM 元素 =====
let editor, preview, previewWrapper, wordCount, themeToggle, themeIcon, loadExampleBtn, exportMdBtn, clearBtn, hljsTheme, selectionStatus;

// ===== 状态 =====
let currentTheme = 'light';
let autoSaveTimer = null;
let isInitialized = false;
let previewCharElements = [];
let sourceToPreviewBoundary = [];
let previewToSourceBoundary = [];
let isSelectionSyncing = false;

// ===== 检查依赖是否加载 =====
function checkDependencies() {
    const deps = {
        marked: typeof marked !== 'undefined',
        hljs: typeof hljs !== 'undefined',
        katex: typeof katex !== 'undefined',
        renderMathInElement: typeof renderMathInElement !== 'undefined',
        DOMPurify: typeof DOMPurify !== 'undefined'
    };

    console.log('依赖检查:', deps);

    const missing = Object.entries(deps).filter(([name, loaded]) => !loaded).map(([name]) => name);
    if (missing.length > 0) {
        console.error('缺少依赖:', missing);
        return false;
    }
    return true;
}

// ===== 初始化 =====
function init() {
    console.log('初始化开始...');

    // 检查依赖
    if (!checkDependencies()) {
        console.error('依赖加载失败，请检查网络连接');
        alert('部分依赖加载失败，请检查网络连接后刷新页面');
        return;
    }

    // 获取 DOM 元素
    editor = document.getElementById('editor');
    preview = document.getElementById('preview');
    previewWrapper = document.querySelector('.preview-wrapper');
    wordCount = document.getElementById('word-count');
    themeToggle = document.getElementById('theme-toggle');
    themeIcon = document.getElementById('theme-icon');
    loadExampleBtn = document.getElementById('load-example');
    exportMdBtn = document.getElementById('export-md');
    clearBtn = document.getElementById('clear');
    hljsTheme = document.getElementById('hljs-theme');
    selectionStatus = document.getElementById('selection-status');

    // 检查 DOM 元素
    if (!editor || !preview) {
        console.error('DOM 元素获取失败');
        return;
    }

    console.log('DOM 元素获取成功');

    // 从 localStorage 读取主题
    try {
        currentTheme = localStorage.getItem('markdown-preview-theme') || 'light';
    } catch (e) {
        console.warn('localStorage 不可用');
    }

    // 设置主题
    setTheme(currentTheme);

    // 加载保存的内容或默认内容
    let savedContent = null;
    try {
        savedContent = localStorage.getItem('markdown-preview-content');
    } catch (e) {
        console.warn('localStorage 不可用');
    }
    editor.value = savedContent || defaultContent;

    console.log('内容加载完成，长度:', editor.value.length);

    // 初始渲染
    updatePreview();
    updateWordCount();

    // 绑定事件
    bindEvents();

    // 锁定 body 滚动，只允许编辑区和预览区滚动
    lockBodyScroll();

    isInitialized = true;
    console.log('初始化完成');
}

// ===== 锁定 body 滚动 =====
function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
}

// ===== 事件绑定 =====
function bindEvents() {
    console.log('绑定事件...');

    // 编辑器输入事件（使用防抖）
    editor.addEventListener('input', function() {
        updatePreview();
        updateWordCount();
        scheduleAutoSave();
    });

    // 主题切换
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            console.log('主题切换按钮点击');
            toggleTheme();
        });
    }

    // 加载示例
    if (loadExampleBtn) {
        loadExampleBtn.addEventListener('click', function() {
            console.log('加载示例按钮点击');
            if (confirm('确定要加载示例内容吗？当前内容将被替换。')) {
                editor.value = defaultContent;
                updatePreview();
                updateWordCount();
                saveToStorage();
            }
        });
    }

    // 导出 Markdown
    if (exportMdBtn) {
        exportMdBtn.addEventListener('click', function() {
            console.log('导出按钮点击');
            exportMarkdown();
        });
    }

    // 清空
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            console.log('清空按钮点击');
            if (confirm('确定要清空所有内容吗？')) {
                editor.value = '';
                updatePreview();
                updateWordCount();
                saveToStorage();
            }
        });
    }

    // 工具栏按钮
    const toolBtns = document.querySelectorAll('.tool-btn[data-action]');
    console.log('找到工具栏按钮数量:', toolBtns.length);

    toolBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const action = btn.dataset.action;
            console.log('工具栏按钮点击:', action);
            handleToolbarAction(action);
        });
    });

    // Tab 键支持
    editor.addEventListener('keydown', handleTabKey);
    editor.addEventListener('select', syncSelectionFromEditor);
    editor.addEventListener('mouseup', scheduleEditorSelectionSync);
    editor.addEventListener('keyup', scheduleEditorSelectionSync);

    // 预览区双向选区联动
    if (preview) {
        preview.addEventListener('mouseup', schedulePreviewSelectionSync);
        preview.addEventListener('keyup', schedulePreviewSelectionSync);
        preview.addEventListener('touchend', schedulePreviewSelectionSync, { passive: true });
    }

    console.log('事件绑定完成');
}

// ===== 更新预览 =====
function updatePreview() {
    if (!editor || !preview) return;

    try {
        const markdown = editor.value;
        const html = renderMarkdown(markdown);
        preview.innerHTML = html;

        // 处理提示卡片
        processTipCards();

        // 渲染 KaTeX 公式
        renderMath();

        // 代码高亮
        highlightCode();

        // 为预览区建立逐字符选区映射
        rebuildPreviewSelectionModel(markdown);
        syncSelectionFromEditor();
    } catch (error) {
        console.error('更新预览失败:', error);
    }
}

// ===== 预览选区模型 =====
function rebuildPreviewSelectionModel(markdown) {
    previewCharElements = [];
    sourceToPreviewBoundary = [];
    previewToSourceBoundary = [];

    if (!preview) return;

    wrapPreviewTextNodes(preview);

    const previewText = preview.textContent || '';
    const alignment = buildSelectionAlignment(markdown, previewText);
    sourceToPreviewBoundary = alignment.sourceToPreviewBoundary;
    previewToSourceBoundary = alignment.previewToSourceBoundary;
}

function wrapPreviewTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function(node) {
            if (!node.nodeValue || !node.nodeValue.length) {
                return NodeFilter.FILTER_REJECT;
            }

            const parent = node.parentElement;
            if (!parent) {
                return NodeFilter.FILTER_REJECT;
            }

            if (parent.closest('script, style, textarea')) {
                return NodeFilter.FILTER_REJECT;
            }

            if (parent.classList && parent.classList.contains('preview-char')) {
                return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const textNodes = [];
    let currentNode = walker.nextNode();

    while (currentNode) {
        textNodes.push(currentNode);
        currentNode = walker.nextNode();
    }

    let previewIndex = 0;

    textNodes.forEach(function(textNode) {
        const fragment = document.createDocumentFragment();
        const text = textNode.nodeValue;

        for (let i = 0; i < text.length; i += 1) {
            const char = text[i];
            const span = document.createElement('span');
            span.className = 'preview-char';
            span.dataset.previewIndex = String(previewIndex);
            span.textContent = char;
            fragment.appendChild(span);
            previewCharElements.push(span);
            previewIndex += 1;
        }

        textNode.parentNode.replaceChild(fragment, textNode);
    });
}

function buildSelectionAlignment(sourceText, previewText) {
    const sourceCharToPreview = new Array(sourceText.length).fill(-1);
    const previewCharToSource = new Array(previewText.length).fill(-1);
    let sourceIndex = 0;
    let previewIndex = 0;

    while (sourceIndex < sourceText.length && previewIndex < previewText.length) {
        const sourceChar = sourceText[sourceIndex];
        const targetChar = previewText[previewIndex];

        if (sourceChar === targetChar) {
            sourceCharToPreview[sourceIndex] = previewIndex;
            previewCharToSource[previewIndex] = sourceIndex;
            sourceIndex += 1;
            previewIndex += 1;
            continue;
        }

        if (isWhitespaceChar(sourceChar) && isWhitespaceChar(targetChar)) {
            sourceCharToPreview[sourceIndex] = previewIndex;
            previewCharToSource[previewIndex] = sourceIndex;
            sourceIndex += 1;
            previewIndex += 1;
            continue;
        }

        if (shouldSkipSourceChar(sourceText, sourceIndex, targetChar)) {
            sourceIndex += 1;
            continue;
        }

        if (isWhitespaceChar(targetChar)) {
            previewIndex += 1;
            continue;
        }

        sourceIndex += 1;
    }

    const sourceToPreviewBoundary = new Array(sourceText.length + 1).fill(0);
    const previewToSourceBoundary = new Array(previewText.length + 1).fill(0);

    let lastPreviewBoundary = 0;
    for (let i = 0; i <= sourceText.length; i += 1) {
        if (i > 0 && sourceCharToPreview[i - 1] !== -1) {
            lastPreviewBoundary = sourceCharToPreview[i - 1] + 1;
        }
        sourceToPreviewBoundary[i] = lastPreviewBoundary;
    }

    let lastSourceBoundary = 0;
    for (let i = 0; i <= previewText.length; i += 1) {
        if (i > 0 && previewCharToSource[i - 1] !== -1) {
            lastSourceBoundary = previewCharToSource[i - 1] + 1;
        }
        previewToSourceBoundary[i] = lastSourceBoundary;
    }

    return {
        sourceToPreviewBoundary: sourceToPreviewBoundary,
        previewToSourceBoundary: previewToSourceBoundary
    };
}

function shouldSkipSourceChar(sourceText, index, targetChar) {
    const currentChar = sourceText[index];
    const nextChar = sourceText[index + 1] || '';
    const prevChar = sourceText[index - 1] || '';
    const syntaxChars = '#*_~`[]()!|>';

    if (syntaxChars.includes(currentChar)) {
        return true;
    }

    if ((currentChar === '-' || currentChar === '+' || currentChar === '.') && !/\d/.test(targetChar || '')) {
        return true;
    }

    if (currentChar === ':' && (prevChar === '|' || nextChar === '|')) {
        return true;
    }

    return false;
}

function isWhitespaceChar(char) {
    return /\s/.test(char || '');
}

function scheduleEditorSelectionSync() {
    window.requestAnimationFrame(syncSelectionFromEditor);
}

function syncSelectionFromEditor() {
    if (!editor || isSelectionSyncing) return;

    const selectionStart = editor.selectionStart || 0;
    const selectionEnd = editor.selectionEnd || 0;
    highlightPreviewSelection(selectionStart, selectionEnd);
}

function schedulePreviewSelectionSync() {
    window.requestAnimationFrame(syncSelectionFromPreview);
}

function syncSelectionFromPreview() {
    if (!editor || !preview) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        if (!preview.contains(document.activeElement)) {
            clearPreviewHighlights();
            updateSelectionStatus('双向高亮已就绪');
        }
        return;
    }

    const range = selection.getRangeAt(0);
    if (!preview.contains(range.commonAncestorContainer)) {
        return;
    }

    const previewStart = getPreviewBoundaryIndex(range.startContainer, range.startOffset);
    const previewEnd = getPreviewBoundaryIndex(range.endContainer, range.endOffset);
    const normalizedStart = Math.max(0, Math.min(previewStart, previewEnd));
    const normalizedEnd = Math.max(normalizedStart, Math.max(previewStart, previewEnd));
    const sourceStart = previewToSourceBoundary[normalizedStart] || 0;
    const sourceEnd = previewToSourceBoundary[normalizedEnd] || sourceStart;

    highlightPreviewRange(normalizedStart, normalizedEnd);
    updateSelectionStatus('预览区已同步到编辑区');

    isSelectionSyncing = true;
    editor.focus();
    editor.setSelectionRange(sourceStart, sourceEnd);
    isSelectionSyncing = false;
}

function getPreviewBoundaryIndex(container, offset) {
    if (container.nodeType === Node.TEXT_NODE) {
        const parent = container.parentElement;
        if (parent && parent.classList.contains('preview-char')) {
            const index = Number(parent.dataset.previewIndex || 0);
            return index + Math.min(offset, 1);
        }
    }

    if (container.nodeType === Node.ELEMENT_NODE) {
        const element = container;

        if (element.classList.contains('preview-char')) {
            const index = Number(element.dataset.previewIndex || 0);
            return index + Math.min(offset, 1);
        }

        const childAtOffset = element.childNodes[offset] || null;
        const firstChar = childAtOffset ? findBoundaryChar(childAtOffset, true) : null;
        if (firstChar) {
            return Number(firstChar.dataset.previewIndex || 0);
        }

        const previousChild = element.childNodes[offset - 1] || null;
        const lastChar = previousChild ? findBoundaryChar(previousChild, false) : null;
        if (lastChar) {
            return Number(lastChar.dataset.previewIndex || 0) + 1;
        }
    }

    return previewCharElements.length;
}

function findBoundaryChar(node, forward) {
    if (!node) return null;

    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node;
        if (element.classList.contains('preview-char')) {
            return element;
        }
    }

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, {
        acceptNode: function(candidate) {
            return candidate.classList && candidate.classList.contains('preview-char')
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP;
        }
    });

    return forward ? walker.nextNode() : getLastWalkerNode(walker);
}

function getLastWalkerNode(walker) {
    let lastNode = null;
    let currentNode = walker.nextNode();

    while (currentNode) {
        lastNode = currentNode;
        currentNode = walker.nextNode();
    }

    return lastNode;
}

function highlightPreviewSelection(sourceStart, sourceEnd) {
    if (!sourceToPreviewBoundary.length) {
        clearPreviewHighlights();
        return;
    }

    const normalizedStart = Math.max(0, Math.min(sourceStart, sourceEnd));
    const normalizedEnd = Math.max(normalizedStart, Math.max(sourceStart, sourceEnd));
    const previewStart = sourceToPreviewBoundary[normalizedStart] || 0;
    const previewEnd = sourceToPreviewBoundary[normalizedEnd] || previewStart;

    if (normalizedStart === normalizedEnd || previewStart === previewEnd) {
        clearPreviewHighlights();
        updateSelectionStatus('双向高亮已就绪');
        return;
    }

    highlightPreviewRange(previewStart, previewEnd);
    updateSelectionStatus('编辑区已同步到预览区');
}

function highlightPreviewRange(start, end) {
    clearPreviewHighlights();

    for (let i = start; i < end; i += 1) {
        const element = previewCharElements[i];
        if (element) {
            element.classList.add('is-highlighted');
        }
    }

    if (previewWrapper && previewCharElements[start]) {
        previewCharElements[start].scrollIntoView({
            block: 'nearest',
            inline: 'nearest'
        });
    }

    const previewPane = preview ? preview.closest('.preview-pane') : null;
    if (previewPane) {
        previewPane.classList.add('is-selection-active');
    }
}

function clearPreviewHighlights() {
    previewCharElements.forEach(function(element) {
        element.classList.remove('is-highlighted');
    });

    const previewPane = preview ? preview.closest('.preview-pane') : null;
    if (previewPane) {
        previewPane.classList.remove('is-selection-active');
    }
}

function updateSelectionStatus(text) {
    if (selectionStatus) {
        selectionStatus.textContent = text;
    }
}

// ===== 处理提示卡片 =====
function processTipCards() {
    if (!preview) return;

    // 查找所有段落，检查是否包含 :::tip 和 :::
    const paragraphs = preview.querySelectorAll('p');
    paragraphs.forEach(function(p) {
        const html = p.innerHTML;
        // 检查是否是提示卡片格式
        if (html.includes(':::tip')) {
            // 提取提示内容
            const content = html.replace(':::tip', '').replace(':::', '').trim();
            if (content) {
                // 创建提示卡片元素
                const tipDiv = document.createElement('div');
                tipDiv.className = 'tip';
                tipDiv.innerHTML = content;
                p.replaceWith(tipDiv);
            } else {
                // 空提示卡片，移除
                p.remove();
            }
        }
    });
}

// ===== Markdown 渲染 =====
function renderMarkdown(markdown) {
    if (!markdown) return '';

    try {
        // 配置 marked
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false
        });

        // 自定义渲染器
        const renderer = new marked.Renderer();

        // 自定义代码块渲染
        renderer.code = function(code, language) {
            const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
            return `<pre><code class="hljs language-${validLanguage}">${escapeHtml(code)}</code></pre>`;
        };

        // 自定义任务列表渲染
        renderer.listitem = function(text, task, checked) {
            if (task) {
                return `<li class="task-list-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled> ${text}</li>`;
            }
            return `<li>${text}</li>`;
        };

        marked.use({ renderer });

        // 渲染 Markdown
        let html = marked.parse(markdown);

        // XSS 防护 - 允许 div 和 tip 类
        if (typeof DOMPurify !== 'undefined') {
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: [
                    'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'strong', 'em', 'del', 'a', 'img', 'blockquote',
                    'ul', 'ol', 'li', 'code', 'pre', 'table', 'thead',
                    'tbody', 'tr', 'th', 'td', 'div', 'span', 'input'
                ],
                ALLOWED_ATTR: [
                    'href', 'src', 'alt', 'title', 'class', 'id',
                    'type', 'checked', 'disabled', 'language'
                ],
                ALLOWED_CLASSES: {
                    'div': ['tip', 'katex-display'],
                    '*': ['hljs', 'language-*', 'task-list-item']
                }
            });
        }

        return html;
    } catch (error) {
        console.error('Markdown 渲染失败:', error);
        return `<p style="color: red;">渲染错误: ${escapeHtml(error.message)}</p>`;
    }
}

// ===== HTML 转义 =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== 渲染数学公式 =====
function renderMath() {
    if (typeof renderMathInElement === 'undefined' || !preview) return;

    try {
        // 先处理块级公式，将 $$...$$ 转换为 KaTeX 可识别的格式
        const mathElements = preview.querySelectorAll('p');
        mathElements.forEach(function(p) {
            const text = p.textContent;
            // 检查是否是块级公式（以 $$ 开头和结尾）
            if (text.trim().startsWith('$$') && text.trim().endsWith('$$')) {
                // 提取公式内容
                const formula = text.trim().slice(2, -2).trim();
                // 创建新的 div 元素用于显示公式
                const div = document.createElement('div');
                div.className = 'katex-display';
                try {
                    katex.render(formula, div, {
                        throwOnError: false,
                        displayMode: true
                    });
                    p.replaceWith(div);
                } catch (e) {
                    console.error('KaTeX 块级公式渲染失败:', e);
                }
            }
        });

        // 然后使用 auto-render 处理行内公式
        renderMathInElement(preview, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false
        });
    } catch (error) {
        console.error('KaTeX 渲染失败:', error);
    }
}

// ===== 代码高亮 =====
function highlightCode() {
    if (typeof hljs === 'undefined' || !preview) return;

    try {
        preview.querySelectorAll('pre code').forEach(function(block) {
            hljs.highlightElement(block);
        });
    } catch (error) {
        console.error('代码高亮失败:', error);
    }
}

// ===== 字数统计 =====
function updateWordCount() {
    if (!editor || !wordCount) return;

    const text = editor.value;
    const count = text.length;
    wordCount.textContent = count + ' 字';
}

// ===== 自动保存 =====
function scheduleAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(saveToStorage, 1000);
}

function saveToStorage() {
    try {
        if (editor) {
            localStorage.setItem('markdown-preview-content', editor.value);
        }
    } catch (e) {
        console.warn('保存到 localStorage 失败');
    }
}

// ===== 主题切换 =====
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;

    // 更新代码高亮主题
    if (hljsTheme) {
        if (theme === 'dark') {
            hljsTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        } else {
            hljsTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        }
    }

    // 更新图标
    if (themeIcon) {
        if (theme === 'dark') {
            themeIcon.innerHTML = '<path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000 1.41.996.996 0 001.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06z"/>';
        } else {
            themeIcon.innerHTML = '<path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>';
        }
    }

    try {
        localStorage.setItem('markdown-preview-theme', theme);
    } catch (e) {
        console.warn('保存主题到 localStorage 失败');
    }
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// ===== 工具栏操作 =====
function handleToolbarAction(action) {
    if (!editor) return;

    console.log('执行工具栏操作:', action);

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    let replacement = '';
    let cursorOffset = 0;
    let selectStart = 0;
    let selectEnd = 0;

    switch (action) {
        case 'heading':
            replacement = '## ' + (selectedText || '标题');
            cursorOffset = 3;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 2);
            break;
        case 'bold':
            replacement = '**' + (selectedText || '粗体文本') + '**';
            cursorOffset = 2;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 4);
            break;
        case 'italic':
            replacement = '*' + (selectedText || '斜体文本') + '*';
            cursorOffset = 1;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 4);
            break;
        case 'strikethrough':
            replacement = '~~' + (selectedText || '删除线文本') + '~~';
            cursorOffset = 2;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 5);
            break;
        case 'link':
            replacement = '[' + (selectedText || '链接文本') + '](https://example.com)';
            cursorOffset = 1;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 4);
            break;
        case 'image':
            replacement = '![' + (selectedText || '图片描述') + '](图片URL)';
            cursorOffset = 2;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 4);
            break;
        case 'code':
            if (selectedText.includes('\n')) {
                replacement = '\`\`\`\n' + (selectedText || '代码块') + '\n\`\`\`';
                cursorOffset = 4;
                selectStart = start + cursorOffset;
                selectEnd = selectStart + (selectedText ? selectedText.length : 3);
            } else {
                replacement = '\`' + (selectedText || '行内代码') + '\`';
                cursorOffset = 1;
                selectStart = start + cursorOffset;
                selectEnd = selectStart + (selectedText ? selectedText.length : 4);
            }
            break;
        case 'quote':
            replacement = '> ' + (selectedText || '引用文本');
            cursorOffset = 2;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 4);
            break;
        case 'list':
            replacement = '- ' + (selectedText || '列表项');
            cursorOffset = 2;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 3);
            break;
        case 'ordered-list':
            replacement = '1. ' + (selectedText || '列表项');
            cursorOffset = 3;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 3);
            break;
        case 'task-list':
            replacement = '- [ ] ' + (selectedText || '待办事项');
            cursorOffset = 6;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 4);
            break;
        case 'table':
            replacement = '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容1 | 内容2 | 内容3 |';
            cursorOffset = 0;
            selectStart = start;
            selectEnd = start + replacement.length;
            break;
        case 'formula':
            replacement = '$' + (selectedText || '公式') + '$';
            cursorOffset = 1;
            selectStart = start + cursorOffset;
            selectEnd = selectStart + (selectedText ? selectedText.length : 2);
            break;
        case 'horizontal-rule':
            replacement = '\n---\n';
            cursorOffset = 5;
            selectStart = start + replacement.length;
            selectEnd = selectStart;
            break;
        default:
            console.warn('未知的操作:', action);
            return;
    }

    // 插入文本
    editor.focus();
    editor.setRangeText(replacement, start, end, 'end');

    // 设置选区
    if (!selectedText) {
        editor.setSelectionRange(selectStart, selectEnd);
    }

    // 触发更新
    updatePreview();
    updateWordCount();
    scheduleAutoSave();

    console.log('工具栏操作完成');
}

// ===== Tab 键处理 =====
function handleTabKey(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;

        if (e.shiftKey) {
            // Shift+Tab: 减少缩进
            const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
            const currentLine = editor.value.substring(lineStart, end);
            if (currentLine.startsWith('    ')) {
                editor.setRangeText('', lineStart, lineStart + 4, 'end');
            } else if (currentLine.startsWith('\t')) {
                editor.setRangeText('', lineStart, lineStart + 1, 'end');
            }
        } else {
            // Tab: 增加缩进
            editor.setRangeText('    ', start, end, 'end');
        }

        updatePreview();
        scheduleAutoSave();
    }
}

// ===== 导出 Markdown =====
function exportMarkdown() {
    if (!editor) return;

    const content = editor.value;
    if (!content) {
        alert('没有内容可导出！');
        return;
    }

    try {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'markdown-' + new Date().toISOString().slice(0, 10) + '.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败: ' + error.message);
    }
}

// ===== 启动应用 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM 已经加载完成
    init();
}
