# AI 生图站方案

## 1. 项目定位

做一个网页版 AI 生图站，首发只做最核心的一条链路：

- 输入 Prompt
- 选择模型
- 生成图片
- 查看结果
- 下载图片
- 查看历史记录并复用 Prompt

技术栈限定：

- React + TypeScript
- Supabase
- HeroUI

模型接入限定：

- 只通过中转站接 `baseUrl + apiKey`
- 首发支持两个 provider：`image2`、`nanobanana`
- 前端不直连第三方模型接口，统一走服务端代理

产品目标不是做“功能最全”，而是做“体验最顺手、审美最在线、首屏就能出图”的轻量高质版本。

## 2. 竞品调研结论

### 2.1 YouMind

YouMind 不是一个纯生图产品，更像“AI 创作工作台”。它的重点是 Board、资料组织、AI 写作、AI 生成内容协作。[官方 overview](https://youmind.ai/overview) 明确把产品定位为 “AI Creation Studio”，并强调 Board 是创作工作区，输出形式可以是文档、思维导图，甚至图片。其更新页也显示图片生成更像嵌入式能力，而非唯一主流程，比如 [v0.2.2 更新](https://youmind.ai/updates/v0-2-2) 提到支持 ChatGPT 4o 图像生成，[0.3 更新](https://youmind.ai/updates/officially-introducing-ai-write-and-new-board) 强调的是 AI Write 和 New Board。

可借鉴点：

- “项目/Board” 作为工作容器，而不是只有一条生成历史
- 画布式、内容块式组织方式
- 图片是创作过程的一部分，不是孤立结果

不建议首发照抄的点：

- 资料采集
- 长文写作
- 多模态知识管理
- 自定义 AI Assistant

结论：YouMind 更适合抄“工作区思路”，不适合抄“首发功能范围”。

### 2.2 Midjourney Web

Midjourney 的 Web 版已经把“Prompt 输入 + 生成流 + 编辑入口 + 历史组织”做得非常成熟。[Creating on Web](https://docs.midjourney.com/hc/en-us/articles/33390732264589-Creating-on-Web) 把 `Create page` 定义为生成中心，生成过程直接在页面流里出现；Imagine Bar 除了输入 Prompt，还放了上传图片、设置、Personalization、Draft Mode、Conversational Mode、搜索和 folders。  
[Website Overview](https://docs.midjourney.com/hc/en-us/articles/33329460426765-Website-Overview) 显示它还有 Explore、Edit、Profile 等完整结构。  
[Full Editor](https://docs.midjourney.com/hc/en-us/articles/32764383466893-Full-Editor) 和 [Modifying Your Creations](https://docs.midjourney.com/hc/en-us/articles/33329329805581-Modifying-Your-Creations) 说明它把后续编辑也衔接得很顺。

最值得抄的点：

- 页面中心是持续流动的生成结果，而不是表单页
- Prompt Bar 固定在底部或顶部，始终可用
- 每张图片卡片的二次操作非常明确：再次生成、变体、编辑、下载、复用 Prompt
- “Create / Explore / Organize / Edit” 的导航结构非常清晰

### 2.3 Krea

Krea 的核心优势不是普通文生图，而是“实时生成 + 画布”。[Krea Realtime 文档](https://docs.krea.ai/user-guide/features/realtime) 把产品描述为 live generation canvas；[Krea Image 文档](https://docs.krea.ai/user-guide/features/krea-image) 强调同一个 Prompt 可以配合模型、参考图、起始图进行控制；[What is Krea](https://docs.krea.ai/get-started/what-is-krea) 明确把产品定义为多模型创意套件。

最值得抄的点：

- 视觉上更像创意工具，不像后台
- 强调“参考图”和“风格控制”
- 结果页更像创意工作台，而不是电商列表

首发不必抄的点：

- Realtime canvas
- 无限画布
- 视频、3D、增强、Patterns 等延伸能力

### 2.4 Leonardo

Leonardo 强项在“生成 + 资产管理 + 轻编辑 + 团队协作”。[Realtime Canvas](https://intercom.help/leonardo-ai/en/articles/8658301-realtime-canvas) 和 [API guide for Realtime Canvas](https://docs.leonardo.ai/docs/generate-images-with-realtime-canvas) 体现它的画布编辑能力；[Collections](https://intercom.help/leonardo-ai/en/articles/13610244-creating-and-sharing-collections-with-your-team) 体现它对生成内容归档和分组的重视。

最值得抄的点：

- Collection/项目归档能力
- 生成结果默认就是资产，可收藏、可分组、可回看
- 结果卡片的管理动作非常完整

### 2.5 Ideogram

Ideogram 很强的一点是把“生成”和“Canvas 编辑/组织”打通。[Canvas Overview](https://docs.ideogram.ai/canvas-and-editing/canvas/canvas-overview) 直接把 Canvas 定义成无限创意板；[Generate & Remix](https://docs.ideogram.ai/using-ideogram/ideogram-features/canvas/generate-and-remix) 说明 Canvas 里的 Generate 与标准生成体验打通；[官方文档首页](https://docs.ideogram.ai/) 还能看到批量生成等能力。

最值得抄的点：

- 生成结果天然进入一个可继续操作的空间
- 大图预览和资产操作都比较顺
- 页面结构非常面向创作者，而不是面向“参数配置”

## 3. 竞品共性总结

真正好的生图产品，几乎都有这几个共性：

- Prompt 输入框始终可见，不把用户赶去单独表单页
- 生成结果不是弹窗，而是进入持续可滚动的生成流
- 图片卡片有高频动作：下载、复用 Prompt、再次生成、收藏、删除
- 历史记录非常重要，用户经常靠历史回看和二次生成
- 即使能力复杂，默认入口也足够简单
- 视觉上更像创意软件，不像传统 SaaS 后台

所以你的首发产品应该做成：

一个极简但高级的“生成工作台”，而不是“参数表单工具”。

## 4. 建议的首发产品形态

### 4.1 产品定位

一句话：

一个极简、高审美、面向创作者的 AI 生图工作台。

### 4.2 首发只做的功能

- 邮箱或魔法链接登录
- Prompt 输入
- 模型切换：`image2` / `nanobanana`
- 比例选择：`1:1`、`4:5`、`16:9`
- 张数选择：`1 / 2 / 4`
- 生成队列与状态展示
- 历史图片流
- 图片详情抽屉
- 下载
- 复制 Prompt
- 再次生成
- 收藏
- 项目分组

### 4.3 首发不做

- 文生视频
- 局部重绘
- 无限画布
- 公开 Explore 社区
- 高级参数泛滥
- 多图混合编辑
- 多人协作

## 5. 信息架构

建议直接采用接近 Midjourney Web + YouMind Board 的混合结构。

### 5.1 一级导航

- `Create`
- `Projects`
- `Favorites`
- `Settings`

### 5.2 Create 页面

Create 是绝对主页面，打开后直接可生成。

页面结构：

1. 左侧窄栏
   - Logo
   - Create
   - Projects
   - Favorites
   - Settings
   - 用户信息

2. 中央内容区
   - 顶部标题区
   - 当前项目名称
   - 生成结果瀑布流 / Masonry Grid

3. 底部固定 Prompt Composer
   - Prompt 输入框
   - 模型切换
   - 比例选择
   - 张数选择
   - Generate 按钮

4. 右侧详情抽屉
   - 点击卡片后打开
   - 大图预览
   - Prompt
   - 模型
   - 创建时间
   - 下载 / 收藏 / 复用 / 再生成

### 5.3 Projects 页面

不是复杂的 Board，只是轻量项目分组：

- 项目卡片列表
- 每个项目显示封面、图片数、最后更新时间
- 点击进入项目的 Create 工作区

### 5.4 Favorites 页面

- 展示收藏图
- 支持从收藏图一键回到原 Prompt

### 5.5 Settings 页面

- 仅保留账户设置
- 是否显示 Prompt 元信息
- 默认比例
- 默认模型

不要把第三方 `baseUrl/apiKey` 暴露给终端用户。那属于站点管理员配置，不应该出现在普通用户设置里。

## 6. 设计方向

## 6.1 设计原则

你的要求是“非常有 sense”，那就一定不能做成默认 HeroUI 风格的普通后台。

建议视觉方向：

- 调性：Creative software，不是 Admin dashboard
- 气质：冷静、克制、高级、偏编辑器
- 观感：更像 Midjourney/Krea，不像工具站模板
- 信息层级：大留白 + 强图像 + 少边框

### 6.2 建议的品牌视觉

- 背景：暖灰黑 + 冷灰层次，不用纯黑
- 点缀色：酸黄绿或偏钴蓝二选一
- 卡片：半透明深色面板，低对比描边
- 圆角：中等偏大，统一 16-20px
- 阴影：柔和扩散，不要重阴影

建议一套可用色板：

- `--bg: #0f1115`
- `--bg-elevated: #151922`
- `--panel: rgba(255,255,255,0.05)`
- `--panel-strong: rgba(255,255,255,0.08)`
- `--border: rgba(255,255,255,0.08)`
- `--text: #f5f7fb`
- `--text-muted: #98a2b3`
- `--accent: #b7ff4a`
- `--accent-2: #6ea8fe`

### 6.3 字体建议

不要走默认 `Inter + HeroUI 原样式`。

建议：

- 英文 UI：`Suisse Int'l` 气质方向，开源替代可选 `Geist` 或 `Plus Jakarta Sans`
- 中文 UI：`PingFang SC` / `MiSans` / `HarmonyOS Sans SC`
- 展示标题可单独用更有性格的字体，但正文保持克制

### 6.4 布局建议

- 左侧边栏固定，宽度 76-88px
- 主内容区最大宽度不要限制死，适配大图流
- Prompt 输入栏固定在底部居中，像创作控制台
- 图片流用 3-5 列自适应瀑布流

### 6.5 动效建议

- 页面初载入：卡片淡入 + 轻微上浮
- 生成中：卡片 skeleton 采用 shimmer，不要转圈圈为主
- 选中图片：右侧抽屉推入，背景轻微 blur
- Hover：卡片只做 2-4px 浮动和边框增强

## 7. 可以“照抄”的范围

可以直接参考竞品的：

- 信息架构
- 导航命名
- Prompt 区域布局
- 图片流结构
- 卡片动作布局
- 抽屉式详情交互
- 项目分组方式

不建议直接复制的：

- Logo
- 插画
- 文案
- 品牌色比例
- 具体图标造型
- 精确像素级视觉稿

更稳妥的做法是：

“照抄结构和交互节奏，重做视觉细节和品牌表达”。

## 8. 技术方案

## 8.1 技术栈建议

- 前端：React + TypeScript + Vite
- UI：HeroUI + 自定义 design tokens
- 状态管理：Zustand
- 数据请求：TanStack Query
- 后端基础设施：Supabase Auth + Postgres + Storage + Edge Functions
- 图片存储：Supabase Storage
- 瀑布流：CSS columns 或 react-virtualized 方案

## 8.2 为什么必须走服务端代理

因为你现在的模型接入方式是：

- 中转站 `baseUrl`
- 中转站 `apiKey`

这两个绝不能出现在前端。

正确做法：

1. 前端调用 Supabase Edge Function：`/generate-image`
2. Edge Function 从环境变量读取：
   - `IMAGE_PROXY_BASE_URL`
   - `IMAGE_PROXY_API_KEY`
3. Edge Function 根据前端传入的 `provider=model` 来拼接请求
4. 生成完成后把图片上传到 Supabase Storage
5. 把 generation 记录写入 Postgres
6. 返回站内图片地址和 metadata 给前端

## 8.3 Provider 抽象

即使首发只有两个模型，也建议一开始就做 provider adapter。

接口建议：

```ts
type ImageProvider = "image2" | "nanobanana";

type GenerateImageInput = {
  prompt: string;
  provider: ImageProvider;
  aspectRatio: "1:1" | "4:5" | "16:9";
  count: 1 | 2 | 4;
  projectId?: string;
};

type GenerateImageResult = {
  images: Array<{
    url: string;
    width?: number;
    height?: number;
    seed?: string;
  }>;
  raw?: unknown;
};
```

服务端实现：

- `providers/image2.ts`
- `providers/nanobanana.ts`
- `providers/index.ts`

统一暴露：

```ts
export async function generateWithProvider(input: GenerateImageInput) {}
```

这样以后加第三个模型不需要重写业务层。

## 8.4 推荐数据库结构

### `profiles`

```sql
id uuid primary key references auth.users(id)
username text
avatar_url text
created_at timestamptz default now()
```

### `projects`

```sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id)
name text not null
cover_image_id uuid null
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `generations`

```sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id)
project_id uuid null references projects(id)
prompt text not null
provider text not null
aspect_ratio text not null
image_count int not null
status text not null
error_message text null
created_at timestamptz default now()
updated_at timestamptz default now()
```

### `generation_images`

```sql
id uuid primary key default gen_random_uuid()
generation_id uuid not null references generations(id) on delete cascade
user_id uuid not null references auth.users(id)
storage_path text not null
width int null
height int null
seed text null
is_favorite boolean default false
created_at timestamptz default now()
```

### `prompt_presets`

```sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id)
title text not null
content text not null
created_at timestamptz default now()
```

## 8.5 RLS 建议

所有业务表都启用 RLS，仅允许用户访问自己的数据。Supabase 官方文档明确推荐用 RLS 和 `auth.uid()` 做用户级隔离，可参考 [RLS 文档](https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security)。

策略原则：

- `projects.user_id = auth.uid()`
- `generations.user_id = auth.uid()`
- `generation_images.user_id = auth.uid()`
- Storage bucket 设私有
- 前端通过签名 URL 或受控下载接口读取

## 8.6 Storage 方案

建议：

- Bucket 名称：`generated-images`
- 路径规则：`{user_id}/{generation_id}/{image_id}.webp`
- Bucket 默认私有

理由：

- 方便未来做权限隔离
- 方便删除整组 generation
- 方便生成签名 URL

Supabase Storage 官方文档支持签名 URL 模式，可参考 [Serving assets from Storage](https://supabase.com/docs/guides/storage/serving/downloads) 和 [createSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)。

## 8.7 生成链路

完整链路：

1. 用户在 Create 页输入 Prompt
2. 前端先插入一条 `generations` 记录，状态 `pending`
3. 调用 Edge Function
4. Edge Function 请求中转站模型接口
5. 拿到远端图片后写入 Supabase Storage
6. 写入 `generation_images`
7. 更新 `generations.status = succeeded`
8. 前端通过 realtime 或 query invalidate 刷新卡片

失败链路：

- 写回 `generations.status = failed`
- 保存 `error_message`

## 9. 前端页面方案

## 9.1 Create 页面核心组件

- `AppSidebar`
- `ProjectHeader`
- `GenerationFeed`
- `GenerationCard`
- `PromptComposer`
- `ImageDetailDrawer`
- `EmptyState`
- `GenerationSkeletonCard`

### 9.2 PromptComposer 交互

输入区一定要是全站的灵魂。

结构建议：

- 大号多行输入框
- 左侧模型 chip
- 比例切换 segmented control
- 张数选择
- 右侧主按钮 `Generate`

体验要求：

- Enter 提交，Shift+Enter 换行
- 最近一次配置自动记忆
- 生成中按钮变成 loading 态
- 输入为空时禁用

### 9.3 GenerationCard 设计

卡片上只放最必要动作：

- 预览
- 下载
- 收藏
- 复制 Prompt
- 再生成

默认不要在卡片表面堆太多文字；大部分 metadata 放进 hover overlay 或详情抽屉。

### 9.4 ImageDetailDrawer

这是提升“高级感”的关键区域。

右侧抽屉内容建议：

- 大图
- Prompt 全文
- provider
- 比例
- 生成时间
- 操作按钮组
- 相邻图片切换

## 10. 首发版本的设计复刻策略

如果你的目标是“全面照抄竞品即可”，我建议实际执行时这样拆：

### 抄 Midjourney

- 总体 IA
- Create 主页面结构
- Prompt bar 的存在感
- 图片流 + 详情抽屉

### 抄 Krea

- 视觉气质
- 创意工具感
- 高级面板层次

### 抄 YouMind

- 项目容器思路
- 工作区感
- “创作过程”而非“单次调用”的 framing

### 抄 Leonardo / Ideogram

- Collections / Favorites 的资产管理方式
- 大图预览与继续操作逻辑

## 11. 推荐开发阶段

### Phase 1

- 初始化 React + TS + Vite
- 接入 HeroUI
- 建立 design tokens
- 搭建页面骨架

### Phase 2

- Supabase Auth
- 数据库表
- RLS
- Storage bucket

### Phase 3

- Edge Function 代理中转站
- provider adapter
- 生成链路打通

### Phase 4

- 图片流
- 详情抽屉
- 收藏与项目

### Phase 5

- 动效、细节、空状态、加载态
- 移动端适配

## 12. 我对这个产品的最终建议

如果要把这个站点做得“像样”，最重要的不是一开始塞很多参数，而是：

- 首页直接进入生成
- Prompt 输入体验非常顺
- 结果流非常漂亮
- 历史和复用非常自然
- 整体审美像创作软件

也就是说，首发最优策略不是做“功能型站点”，而是做“高质感工作台”。

如果按这个方向做，最适合你的 MVP 是：

一个只有四个页面的高审美 AI 生图站：

- Create
- Projects
- Favorites
- Settings

它看起来像 Midjourney Web 的简化版，带一点 Krea 的气质和 YouMind 的项目感。

## 13. 参考来源

- [YouMind Overview](https://youmind.ai/overview)
- [YouMind 0.3 Update](https://youmind.ai/updates/officially-introducing-ai-write-and-new-board)
- [YouMind v0.2.2 Update](https://youmind.ai/updates/v0-2-2)
- [Midjourney Creating on Web](https://docs.midjourney.com/hc/en-us/articles/33390732264589-Creating-on-Web)
- [Midjourney Website Overview](https://docs.midjourney.com/hc/en-us/articles/33329460426765-Website-Overview)
- [Midjourney Full Editor](https://docs.midjourney.com/hc/en-us/articles/32764383466893-Full-Editor)
- [Midjourney Modifying Your Creations](https://docs.midjourney.com/hc/en-us/articles/33329329805581-Modifying-Your-Creations)
- [Krea Realtime](https://docs.krea.ai/user-guide/features/realtime)
- [Krea Image](https://docs.krea.ai/user-guide/features/krea-image)
- [Krea What is Krea](https://docs.krea.ai/get-started/what-is-krea)
- [Leonardo Realtime Canvas](https://intercom.help/leonardo-ai/en/articles/8658301-realtime-canvas)
- [Leonardo Realtime Canvas API Guide](https://docs.leonardo.ai/docs/generate-images-with-realtime-canvas)
- [Leonardo Collections](https://intercom.help/leonardo-ai/en/articles/13610244-creating-and-sharing-collections-with-your-team)
- [Ideogram Canvas Overview](https://docs.ideogram.ai/canvas-and-editing/canvas/canvas-overview)
- [Ideogram Generate & Remix](https://docs.ideogram.ai/using-ideogram/ideogram-features/canvas/generate-and-remix)
- [Ideogram Docs Home](https://docs.ideogram.ai/)
- [Supabase RLS](https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security)
- [Supabase Serving assets from Storage](https://supabase.com/docs/guides/storage/serving/downloads)
- [Supabase createSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)
