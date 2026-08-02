# Markdown 预览器

基于浏览器的实时 Markdown 编辑器，左侧输入，右侧即时渲染，并支持公式、代码高亮、主题切换、本地自动保存和 Markdown 导出。

## 功能特性

- 双栏编辑：左侧源码编辑，右侧实时预览
- Markdown 渲染：标题、引用、列表、任务列表、表格、链接、图片、删除线
- 数学公式：支持行内与块级 KaTeX 公式
- 代码高亮：基于 Highlight.js 自动识别语言
- 工具栏：标题、粗体、斜体、链接、图片、代码、引用、列表、表格、公式、水平线等快捷插入
- 主题切换：支持亮色与暗色模式，并记忆偏好
- 自动保存：内容自动写入 `localStorage`
- Markdown 导出：一键下载 `.md` 文件

## 使用方式

直接用浏览器打开 `index.html` 即可运行，无需构建工具和本地服务。

## 技术栈

- `marked`：Markdown 解析
- `KaTeX`：公式渲染
- `Highlight.js`：代码高亮
- `DOMPurify`：HTML 净化

## 项目结构

```text
D:\项目\Markdown预览器
├── index.html
├── css
│   └── style.css
├── js
│   └── app.js
└── .trae
    └── documents
        └── markdown-preview-plan.md
```

## 主要文件说明

- `index.html`：应用骨架，引入样式、外部 CDN 依赖和主脚本
- `css/style.css`：双栏布局、工具栏、预览区、主题变量与响应式样式
- `js/app.js`：默认示例、Markdown 渲染、KaTeX/Highlight.js 集成、主题切换、自动保存、导出与选区联动
- `.trae/documents/markdown-preview-plan.md`：早期需求与实现计划

## 注意事项

- 首次加载依赖网络访问 CDN，若离线使用需提前缓存相关资源
- 本地存储内容仅保存在当前浏览器中，不会自动同步到其他设备
