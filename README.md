# 随心记 · Suixinji

桌面悬浮「随心卡片」+ 可 DIY 桌面挂件：随手记下完成的事、随想与小确幸；挂件可换照片、拖动、互动。

纸质感 3D 卡片 · 主题 DIY · 桌面挂件 · 本地存储 · Windows exe

![空状态](docs/screenshots/card-empty.png)
![记录条目](docs/screenshots/card-entry.png)
![DIY 设置](docs/screenshots/card-settings.png)

## 功能

### 随心卡片

- **四种记录类型**：完成 / 随想 / 感恩 / 自定义名称
- **标签与今日统计**，回车即可记下
- **3D 纸卡**：指针跟随倾斜，记下时轻微回弹
- **主题**：宣纸暖阳 / 夜航 / 樱时 / 海雾 / 自定义主色
- **窗口**：置顶、紧凑布局、透明度、位置记忆；关闭收进托盘

### 桌面挂件

- 透明置顶小窗，可拖动；松手贴边吸附
- 更换本机照片（推荐透明底 PNG 抠图；可自动去白底）
- 抠图原形 / 圆形头像切换
- 单击互动、双击打开卡片、右键菜单、长按抚摸
- 今日完成角标；记下时挂件庆祝
- 可锁定位置、开关置顶、可选鼠标穿透

### 数据

- 全在本机：`%APPDATA%\suixinji\suixinji\data.json`
- 挂件照片：`%APPDATA%\suixinji\suixinji\pets\`（不会打进安装包、不会进 Git）

## 下载

去 [Releases](https://github.com/qiufeng662/suixinji/releases) 下载最新版：

| 文件 | 说明 |
|------|------|
| `suixinji-x.y.z-setup.exe` | 安装版（推荐） |
| `suixinji-x.y.z-portable.exe` | 单文件便携版 |

> 未做代码签名时，Windows SmartScreen 可能提示。点「更多信息 → 仍要运行」。

## 开发

```bash
npm install
# 若 electron.exe 未自动下载：
node node_modules/electron/install.js

npm run dev            # 浏览器预览
npm run electron:dev   # Electron 悬浮窗
npm run typecheck
```

### 打包 Windows

```bash
npm run dist
```

产物在 `release/`。脚本会设置 `ELECTRON_BUILDER_CACHE`，避免部分 Windows 环境解压 winCodeSign 因符号链接权限失败。

## 技术栈

- Electron 35 · React 19 · TypeScript · Vite 6
- electron-builder（NSIS + portable）
- 无后端、无账号、无遥测

## 目录结构

```
suixinji/
├── electron/          # 主进程、preload
├── src/               # React 界面（卡片 + 挂件）
├── build/             # 应用图标
├── docs/              # README 截图与图标源
├── scripts/           # 打包 / 截图 / Win 窗口脚本
├── .github/workflows/ # Windows CI 打包 / Release
├── DESIGN.md
├── CHANGELOG.md
└── package.json
```

更新 README 截图：

```bash
npm run dev          # 另开终端
npm run shot         # 写入 docs/screenshots/
```

## 已知限制

- 部分 Win10/11 环境透明窗顶可能仍有系统 caption 灰条（已在 1.4.x 尽量压制，视系统策略而定）
- 全屏独占程序（部分游戏）可能盖过置顶挂件

## 设计说明

风格锚点：日式文具纸质卡片 × 组件级信息密度。详见 [DESIGN.md](./DESIGN.md)。

版本记录见 [CHANGELOG.md](./CHANGELOG.md)。

## 开源协议

[MIT](./LICENSE)
