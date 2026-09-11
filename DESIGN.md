# 随心记 · Design Spec

## 一句话定位
挂在桌面上的一张「随心卡片」：随手记下今天完成的事、冒出的想法，可深度 DIY，精致到愿意天天看。

## 技术选型（exe vs 其他）

| 方案 | 结论 |
|------|------|
| **Electron → exe（选定）** | 成熟的透明置顶悬浮窗，可打 NSIS/便携 exe，3D/CSS 动效自由 |
| Tauri → exe | 更轻，但本机无 Rust，装链成本高 |
| 纯网页 / PWA | 无法可靠「钉在桌面、始终置顶」 |
| 系统便签 | 无 3D、无深度 DIY |

**结论：Electron + Vite + React + TypeScript，打包 Windows exe。**

## 风格锚点
日式文具铺的纸质卡片 × iOS 小组件的圆角与信息密度 × Things 3 的安静克制。  
不是冷玻璃拟态，是「有厚度的纸卡」：暖纸色、墨字、苔绿印泥色。

## 色板

| Token | Hex | 用途 |
|-------|-----|------|
| `--ink` | `#1C1917` | 正文墨色 |
| `--paper` | `#F6F1E7` | 主卡纸底 |
| `--paper-deep` | `#EDE6D8` | 次层纸/凹槽 |
| `--moss` | `#3D5A4C` | 主强调（完成勾、主按钮） |
| `--clay` | `#C4785A` | 次强调（标记、心情） |
| `--mist` | `#A8A29E` | 分割线、次要文字 |
| `--night-ink` | `#E8E4DC` | 夜间文字 |
| `--night-paper` | `#1A1816` | 夜间纸底 |

可 DIY 主题：宣纸暖阳 / 夜航 / 樱时 / 海雾 / 自定义主色。

## 字体

- 标题 / 日期：`Georgia, "Songti SC", "SimSun", serif` — 手账封面感
- 正文：`"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`
- 时间戳 / 计数：`"Cascadia Code", Consolas, monospace`

字号阶梯：11 / 12 / 14 / 16 / 20 / 28（widget 紧凑密度）

## 布局

- 浮动卡片宽 `340px`（可 S/M/L：300 / 340 / 400）
- 圆角 `18px`，多层纸影，鼠标跟随 3D 倾斜（最大 ±8°）
- 纵向单栏：顶栏（日期 + 设置）→ 输入区 → 列表 → 底栏（统计 + 快捷）
- 密度：一屏尽量不滚动看完今日；超过 6 条内部滚动

## 签名时刻
**纸卡 3D 触感**：鼠标移入时整卡随指针微倾，阴影与高光同步偏移；完成任务时卡片有一次轻微「落笔」回弹。这是打开应用后 2 秒内能感知的记忆点。

## 自由度 / DIY

1. 主题 5 套 + 自定义主色
2. 条目类型：完成 / 随想 / 感恩 / 自定义标签
3. 自定义字段名、心情表情、标签
4. 窗口：置顶、透明度、紧凑/舒展、圆角
5. 数据本地 JSON，可导出

## 交付

- `npm run dev` 开发（Vite + Electron）
- `npm run build` + `npm run dist` 产出 Windows exe（NSIS / portable）
