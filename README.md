<img width="2556" height="1171" alt="image" src="https://github.com/user-attachments/assets/41a82df7-d95e-4181-bf37-7775362ed115" /># 🎨 Anime Life Preference Table (动画生涯喜好表生成器)

> 一个基于 React + Canvas 的在线生成器，让用户通过拖拽 Emoji 贴纸，轻松制作属于自己的“二次元生涯喜好表”。支持无限画布、高清导出、以及全量 Emoji 中文搜索。
> 
> 目前是全ai项目（包括本篇readme）（感谢gemini鼎力支持），本人还没有看过代码长啥样🤣🤣🤣等我考完试再说（其实考完了也看不懂）



## ✨ 核心功能 (Features)

* **📱 丝滑交互体验**
    * **无限画布**：支持鼠标滚轮缩放、鼠标拖拽平移画布，操作类似专业设计软件。
    * **拖拽贴纸**：所见即所得，拖拽生成的贴纸支持任意移动。
    * **手势操作**：支持对选中的贴纸进行缩放、旋转、层级调整（置顶/置底）和删除。

* **🤩 全量 Emoji 支持**
    * **海量图库**：接入官方 Unicode 全量 Emoji 数据源，支持 3000+ 个 Emoji。
    * **Apple 风格**：全站使用高品质的 Apple Emoji 样式图片渲染，视觉效果极佳。
    * **中文智能搜索**：集成 `emojibase` 中文数据，支持中文关键字搜索（如搜“开心”能找到“😀”），同时也支持通过标签搜索。
    * **性能优化**：列表懒加载 + 骨架屏，加载数千个表情依然流畅。
    * **分类浏览**：支持点击分类 Tab 或通过左右箭头/滚轮快速翻页查看不同类别的 Emoji。

* **🖼️ 灵活的背景模式**
    * **模板模式**：内置经典的“动画生涯喜好表”网格模板。
    * **自定义背景**：支持用户上传本地图片作为背景。

* **💾 高清导出**
    * 一键将画布内容导出为高清 PNG 图片，方便分享到社交媒体。

## 🛠️ 技术栈 (Tech Stack)

* **框架**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
* **语言**: JavaScript (ES6+)
* **样式**: [Tailwind CSS](https://tailwindcss.com/)
* **图标**: [Lucide React](https://lucide.dev/)
* **数据源**: 
    * [Emojibase](https://emojibase.dev/) (提供中文 Emoji 名称与关键字数据)
    * [Unicode Emoji JSON](https://github.com/muan/unicode-emoji-json) (分类映射)
* **CDN**: `emojicdn.elk.sh` (提供 Apple 风格 Emoji 图片)

## 🚀 快速开始 (Quick Start)

### 1. 克隆项目

```bash
git clone [https://github.com/你的用户名/你的仓库名.git](https://github.com/你的用户名/你的仓库名.git)
cd 你的仓库名

```

### 2. 安装依赖

推荐使用 `npm` 或 `yarn`：

```bash
npm install
# 或者
yarn install

```

### 3. 启动开发服务器

```bash
npm run dev
# 或者
yarn dev

```

启动后，访问终端显示的地址（通常是 `http://localhost:5173`）即可预览。

## 📦 部署 (Deployment)

本项目已配置好 GitHub Pages 部署脚本。

1. **修改配置**：
确保 `vite.config.js` 中的 `base` 路径与你的 GitHub 仓库名一致：
```javascript
// vite.config.js
export default defineConfig({
  // ...
  base: '/你的仓库名/', 
})

```


2. **一键部署**：
```bash
npm run deploy

```


脚本会自动打包并推送到远程仓库的 `gh-pages` 分支。等待几分钟后，GitHub Pages 就会自动上线。

## 📂 目录结构 (Project Structure)

```
.
├── public/             # 静态资源 (背景图 background.jpg 等)
├── src/
│   ├── App.jsx         # 核心业务逻辑组件 (画布、搜索、状态管理)
│   ├── index.css       # 全局样式 (Tailwind 指令与滚动条样式)
│   ├── main.jsx        # 入口文件
│   └── ...
├── index.html          # HTML 模板
├── vite.config.js      # Vite 配置文件 (包含 base 路径配置)
├── tailwind.config.js  # Tailwind 配置文件
└── package.json        # 项目依赖与脚本配置

```
